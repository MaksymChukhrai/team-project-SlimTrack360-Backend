import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dayNormaWater } from '../decorators/dayNormaWater.js';
import { determinationDailyLevel } from '../decorators/determinationDailyLevel.js';
import { nanoid } from 'nanoid';
import { User } from '../models/user.js';
import { HttpError } from '../helpers/Error/HttpError.js';
import { calculateMacros } from '../decorators/calculateMacroElem.js';
import { sendEmail } from '../helpers/sendFromPost.js';
import { generateVerificationEmailHTML } from '../helpers/generateVerificationEmailHTML.js';

const { SECRET_KEY, BASE_URL } = process.env;

const signUp = async body => {
  const { email, password } = body;
  const user = await User.findOne({ email });

  if (user) throw HttpError(409, `Email "${email}" in use`);

  const dailyGoalWater = dayNormaWater(body);
  const dailyGoalCalories = determinationDailyLevel(body);
  const { protein, fat, carbonohidrates } = calculateMacros(
    body,
    dailyGoalCalories,
  );

  const hashPassword = await bcryptjs.hash(password, 10);
  const date = new Date();
  const verificationToken = nanoid();

  const document = generateVerificationEmailHTML(verificationToken, BASE_URL);

  const verifyEmail = {
    to: `${email}`,
    subject: 'Verify email!',
    html: `${document}`,
  };

  await sendEmail(verifyEmail);

  return await User.create({
    ...body,
    password: hashPassword,
    verificationToken,
    date: date.getDate(),
    dailyGoalWater,
    dailyGoalCalories,
    dailyGoalElements: { protein, fat, carbonohidrates },
  });
};

const signIn = async body => {
  const userFind = await User.findOne({ email: body.email });

  if (!userFind) throw HttpError(403, 'Email or password is wrong');

  const comparePassword = await bcryptjs.compare(
    body.password,
    userFind.password,
  );

  if (!comparePassword) throw HttpError(403, 'Email or password is wrong');

  const payload = {
    id: userFind._id,
  };

  const token = await jwt.sign(payload, SECRET_KEY, { expiresIn: '10 years' });

  await User.findByIdAndUpdate({ _id: userFind._id }, { token });

  return token;
};

const passwordReset = async (email, _id) => {
  const userFind = await User.findOne({ email });
  if (!userFind) throw HttpError(404, `User with ${email} is missing`);

  const newPassword = nanoid();
  const hashNewPassword = await bcryptjs.hash(newPassword, 8);

  await User.findByIdAndUpdate({ _id }, { password: hashNewPassword });

  return newPassword;
};

const verifyEmail = async verificationToken => {
  const user = await User.findOne({ verificationToken });

  if (!user) throw HttpError(404, 'User not found');

  await User.findByIdAndUpdate(
    { _id: user._id },
    { verify: true, verificationToken: null },
    { new: true },
  );

  return user;
};

const logout = async userId => {
  const user = await User.findByIdAndUpdate({ _id: userId }, { token: '' });
  if (!user) throw HttpError(404, 'User not found');
};

const authServices = {
  signUp,
  signIn,
  passwordReset,
  logout,
  verifyEmail,
};

export default authServices;
