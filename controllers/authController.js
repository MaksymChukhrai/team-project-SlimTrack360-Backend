import { format } from 'date-fns';
import { ctrlWrapper } from '../decorators/ctrlWrapper.js';
import { documentSucssesfullVerification } from '../helpers/documentSucssesfullVarification.js';
import { HttpError } from '../helpers/Error/HttpError.js';
import { sendEmail } from '../helpers/sendFromPost.js';
import { UserWeight } from '../models/userWeight.js';
import authServices from '../services/authServices.js';
import { User } from '../models/user.js';
import jwt from 'jsonwebtoken';
import { dayNormaWater } from '../decorators/dayNormaWater.js';
import { determinationDailyLevel } from '../decorators/determinationDailyLevel.js';
import { calculateMacros } from '../decorators/calculateMacroElem.js';

const { SECRET_KEY } = process.env;

const { BASE_URL } = process.env;

const signUp = async (req, res) => {
  const newUser = await authServices.signUp(req.body);

  // ------ Add weight in userWeight Model ----- //
  const { _id: owner, currentWeight } = newUser;
  const formattedDate = format(new Date(), 'yyyy-MM-dd');

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });

  const userWeight = await UserWeight.findOne({ owner });

  if (!userWeight) {
    const newUserWeight = new UserWeight({
      owner,
      [currentMonth]: [{ date: formattedDate, weight: currentWeight }],
    });

    await newUserWeight.save();
  } else {
    userWeight[currentMonth].push({
      date: formattedDate,
      weight: currentWeight,
    });
    await userWeight.save();
  }

  res.status(201).json({ message: 'Created' });
};

// ---------------  Log in ------------------- //
const signIn = async (req, res) => {
  const user = await authServices.signIn(req.body);

  res.status(200).json({ user, message: 'Login successful' });
};

const passwordForgot = async (req, res) => {
  const password = await authServices.passwordReset(req.body.email);
  if (!password) throw HttpError(400, 'Sorry, user not found');

  const { email } = req.body;

  const forgotPassword = {
    to: `${email}`,
    subject: 'Reset password!',
    text: `Your new password: ${password} Please login again!`,
  };

  await sendEmail(forgotPassword);

  res.json({ message: 'New password send on your email' });
};

const signout = async (req, res) => {
  authServices.logout(req.user._id);

  res.json({ message: 'Logout successful' });
};

// ----- verification with redirect ---- //
const verify = async (req, res) => {
  const { verificationToken } = req.params;

  const user = await User.findOne({ verificationToken });

  if (!user) throw HttpError(404, 'Verification not succsesfull try again');

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '10 years' });

  const status = token ? 'fulfilled' : 'rejected';

  await User.findByIdAndUpdate(
    user._id,
    {
      verify: true,
      verificationToken: null,
      token: token,
    },
    { new: true },
  );

  res.json({
    user: {
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      goal: user.goal,
      sex: user.sex,
      age: user.age,
      height: user.height,
      currentWeight: user.currentWeight,
      levelActivity: user.levelActivity,
      dailyGoalCalories: user.dailyGoalCalories,
      dailyGoalWater: user.dailyGoalWater,
      dailyGoalElements: user.dailyGoalElements,

      status,
      verify: user.verify,
    },
    token,
  });
};

const googleAuth = async (req, res) => {
  const { _id, currentWeight } = req.user;
  const verificationToken = await authServices.google(_id);

  const dailyGoalWater = dayNormaWater(req.user);
  const dailyGoalCalories = determinationDailyLevel(req.user);
  const { protein, fat, carbonohidrates } = calculateMacros(
    req.user,
    dailyGoalCalories,
  );

  await User.findByIdAndUpdate(
    { _id },
    {
      dailyGoalWater,
      dailyGoalCalories,
      dailyGoalElements: { protein, fat, carbonohidrates },
    },
  );

  // ------ Add weight in userWeight Model ----- //

  const formattedDate = format(new Date(), 'yyyy-MM-dd');

  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const owner = _id;
  const userWeight = await UserWeight.findOne({ owner });

  if (!userWeight) {
    const newUserWeight = new UserWeight({
      owner,
      [currentMonth]: [{ date: formattedDate, weight: currentWeight }],
    });

    await newUserWeight.save();
  } else {
    userWeight[currentMonth].push({
      date: formattedDate,
      weight: currentWeight,
    });
    await userWeight.save();
  }

  res.redirect(
    `https://maksymchukhrai.github.io/team-project-SlimTrack360/verify?searchQuery=${verificationToken}`,
  );
};

export default {
  signup: ctrlWrapper(signUp),
  signin: ctrlWrapper(signIn),
  passwordForgot: ctrlWrapper(passwordForgot),
  signout: ctrlWrapper(signout),
  verify: ctrlWrapper(verify),
  googleAuth: ctrlWrapper(googleAuth),
};
