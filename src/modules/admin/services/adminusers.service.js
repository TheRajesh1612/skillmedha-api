// admin-server/src/controllers/authController.js
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const { AdminUser } = require("../../../shared/db/connection").getGlobalCollections();
const { archiveAndDeleteOne } = require("../../../shared/utils/archive.service");

// RBAC-enabled createUser function
const createUser = async (req, res) => {
  try {
    const {
      fullname,
      username,
      email,
      role = "VIEWER",
      isActive = true,
      permissions = {},
      colleges = [],
      companies = [],
      password,
    } = req.body;

    const users = AdminUser;

    if (!email || !password) {
      return res.status(400).json({ err: "Email and password are required" });
    }

    const exists = await users.findOne({ email });
    if (exists) {
      return res
        .status(400)
        .json({ err: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      fullname,
      username,
      email,
      role,
      isActive,
      active: true,
      permissions,
      colleges,
      companies,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      orgId: "KSquare",
    };

    const result = await users.insertOne(newUser);

    const payload = {
      userId: result.insertedId.toString(),
      email,
      role,
      permissions,
      colleges,
      companies,
      isActive,
      username,
      fullname,
      orgId: "KSquare",
    };

    // 1) generate JWT
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET);

    // 2) generate legacy/encrypted token
    const cryptoToken = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      process.env.CRYPTOSECRET
    ).toString();

    // 3) store tokens in DB
    await users.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          jwtToken,
          token: cryptoToken, // legacy field
          lastLoginAt: new Date(),
        },
      }
    );

    const responseUser = { ...newUser, jwtToken, token: cryptoToken };
    delete responseUser.password;

    return res.status(200).json({
      success: true,
      msg: "Account Created Successfully",
      data: {
        _id: result.insertedId,
        ...responseUser,
      },
      user: payload,
      token: jwtToken,
      cryptoToken,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      err: `Error while creating user: ${err.message}`,
    });
  }
};

// RBAC-enabled loginUser function
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        err: "Email and password are required",
      });
    }

    const users = AdminUser;

    // find user
    const user = await users.findOne({ email });
    if (!user?._id) {
      return res.status(404).json({
        success: false,
        err: "User not registered",
      });
    }

    // check active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        err: "Account has been deactivated. Please contact administrator.",
      });
    }

    // check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        err: "Incorrect password",
      });
    }

    // build login data using your schema
    const loginData = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role, // "ADMIN" | "MODERATOR" | "VIEWER"
      permissions: user.permissions || {},
      colleges: user.colleges || [],
      companies: user.companies || [],
      isActive: user.isActive,
      username: user.username,
      fullname: user.fullname,
      lastLoginAt: new Date(),
      orgId: "KSquare",
    };

    // jwt token (same style as createUser)
    const jwtToken = jwt.sign(loginData, process.env.JWT_SECRET);

    // crypto token (legacy style)
    const cryptoToken = CryptoJS.AES.encrypt(
      JSON.stringify(loginData),
      process.env.CRYPTOSECRET
    ).toString();

    // optional: update login meta in DB
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          jwtToken,
          token: cryptoToken,
          lastLoginAt: new Date(),
        },
        $inc: {
          loginCount: 1,
        },
      }
    );

    return res.status(200).json({
      success: true,
      msg: "Logged in successfully",
      ...loginData, // so frontend gets role, permissions, colleges, companies, etc.
      token: jwtToken,
      cryptoToken,
      userRole: user.role,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      err: `Error while login user: ${err.message}`,
    });
  }
};

const ObjIdCheck = (id) => {
  try {
    return new ObjectId(id);
  } catch (error) {
    return id;
  }
};

// Get current user profile
const getCurrentUser = async (req, res) => {
  try {
    const authUser = req.userId;

    if (!authUser) {
      return res.status(401).json({
        success: false,
        err: "User not authenticated",
      });
    }

    const users = AdminUser;

    // get fresh user data from DB (optional but safer)
    const user = await users.findOne({
      _id: ObjIdCheck(authUser),
    });

    if (!user?._id) {
      return res.status(404).json({
        success: false,
        err: "User not found",
      });
    }

    const userProfile = {
      _id: user._id,
      email: user.email,
      username: user.username,
      fullname: user.fullname,
      role: user.role, // "ADMIN" | "MODERATOR" | "VIEWER"
      permissions: user.permissions || {},
      isActive: user.isActive,
      colleges: user.colleges || [],
      companies: user.companies || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      userId: user._id.toString(),
      orgId: "KSquare",
    };

    return res.status(200).json({
      success: true,
      user: userProfile,
      userRole: user.role,
      permissions: user.permissions || {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      err: `Error getting current user: ${error.message}`,
    });
  }
};

// Refresh token
const refreshToken = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        success: false,
        err: "User not authenticated",
      });
    }

    const users = AdminUser;

    // get latest user data (optional but safer)
    const userId = authUser.userId || authUser._id;
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user?._id) {
      return res.status(404).json({
        success: false,
        err: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        err: "Account has been deactivated. Please contact administrator.",
      });
    }

    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      permissions: user.permissions || {},
      colleges: user.colleges || [],
      companies: user.companies || [],
      isActive: user.isActive,
      username: user.username,
      fullname: user.fullname,
    };

    const newJwtToken = jwt.sign(payload, process.env.JWT_SECRET);

    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          jwtToken: newJwtToken,
          lastTokenRefresh: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      token: newJwtToken,
      user: payload,
      userRole: user.role,
      permissions: user.permissions || {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      err: `Error refreshing token: ${error.message}`,
    });
  }
};

// Logout user
const logoutUser = async (req, res) => {
  try {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        success: false,
        err: "User not authenticated",
      });
    }

    const users = AdminUser;

    // try to resolve id from JWT payload or from populated user
    const userId = authUser.userId || authUser._id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        err: "Invalid user data in request",
      });
    }

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $unset: {
          jwtToken: 1,
          token: 1,
        },
        $set: {
          lastLogoutAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      msg: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      err: `Error during logout: ${error.message}`,
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const authUser = req.user;

    // basic validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        err: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        err: "New password must be at least 6 characters long",
      });
    }

    if (!authUser) {
      return res.status(401).json({
        success: false,
        err: "User not authenticated",
      });
    }

    const users = AdminUser;
    const userId = authUser.userId || authUser._id;

    // load full user
    const fullUser = await users.findOne({ _id: new ObjectId(userId) });

    if (!fullUser) {
      return res.status(404).json({
        success: false,
        err: "User not found",
      });
    }

    // verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      fullUser.password
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        err: "Current password is incorrect",
      });
    }

    // hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // update password
    await users.updateOne(
      { _id: fullUser._id },
      {
        $set: {
          password: hashedNewPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      msg: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      err: `Error changing password: ${error.message}`,
    });
  }
};

// GET all users (not only admins)
const getAllUsers = async (req, res) => {
  try {
    const users = AdminUser;

    // optional: only ADMIN can see all users
    // if (req.user?.role !== "ADMIN") {
    //   return res.status(403).json({
    //     success: false,
    //     err: "Forbidden: only admins can view all users",
    //   });
    // }

    const list = await users
      .find({}, { projection: { password: 0 } })
      .toArray();

    return res.status(200).json({
      success: true,
      users: list,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      err: `Error fetching users: ${error.message}`,
    });
  }
};

// Edit / update user (ADMIN-only recommended)
const editUser = async (req, res) => {
  try {
    const { userId } = req.params; // /auth/users/:userId

    if (!userId) {
      return res.status(400).json({
        success: false,
        err: "User ID is required",
      });
    }

    // validate ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        err: "Invalid user ID format",
      });
    }

    const users = AdminUser; // native MongoDB collection

    // Check if user exists and get current orgId
    const existingUser = await users.findOne({ _id: new ObjectId(userId) });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        err: "User not found",
      });
    }

    // fields allowed to update
    const {
      fullname,
      username,
      email,
      role,
      isActive,
      permissions,
      colleges,
      companies,
      password,
    } = req.body;

    const updateData = {
      updatedAt: new Date(),
    };

    // Add orgId if not present
    if (!existingUser.orgId) {
      updateData.orgId = "KSquare";
    }

    if (fullname !== undefined) updateData.fullname = fullname;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (Array.isArray(colleges)) updateData.colleges = colleges;
    if (Array.isArray(companies)) updateData.companies = companies;

    // if password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      {
        returnDocument: "after", // return the updated document
        projection: { password: 0 }, // exclude password in response
      }
    );

    // result can be null or an object with value: null
    if (!result) {
      return res.status(404).json({
        success: false,
        err: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "User updated successfully",
      user: result,
    });
  } catch (error) {
    console.error("editUser error:", error);
    return res.status(500).json({
      success: false,
      err: `Error updating user: ${error.message}`,
    });
  }
};

// Delete user (ADMIN-only recommended)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params; // /auth/users/:userId

    if (!userId) {
      return res.status(400).json({
        success: false,
        err: "User ID is required",
      });
    }

    // validate ObjectId
    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        err: "Invalid user ID format",
      });
    }

    const users = AdminUser;

    // delete the user and (optionally) return the deleted doc
    const archiveResult = await archiveAndDeleteOne(users, { _id: new ObjectId(userId) }, {
      deletedBy: req.userID || null,
      reason: req.body.reason || null,
    });

    if (archiveResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        err: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      msg: "User deleted successfully",
      user: archiveResult.deletedDocument,
    });
  } catch (error) {
    console.error("deleteUser error:", error);
    return res.status(500).json({
      success: false,
      err: `Error deleting user: ${error.message}`,
    });
  }
};

// existing exports
module.exports = {
  createUser,
  loginUser,
  getCurrentUser,
  refreshToken,
  logoutUser,
  changePassword,
  getAllUsers,
  editUser,
  deleteUser,
};
