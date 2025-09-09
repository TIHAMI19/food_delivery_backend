import jwt from "jsonwebtoken"
import { validationResult } from "express-validator"
import User from "../models/User.js"

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

export const register = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { name, email, password, role, phone, address } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || "customer",
      phone,
      address,
    })

    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Server error during registration" })
  }
}

export const login = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { email, password } = req.body

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password")
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
}

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    res.json({ user })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ message: "Server error fetching profile" })
  }
}

export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Validation failed",
        errors: errors.array(),
      })
    }

    const { name, phone, address } = req.body
    const user = await User.findById(req.user._id)

    if (name) user.name = name
    if (phone) user.phone = phone
    if (address) user.address = { ...user.address, ...address }

    await user.save()

    res.json({
      message: "Profile updated successfully",
      user,
    })
  } catch (error) {
    console.error("Update profile error:", error)
    res.status(500).json({ message: "Server error updating profile" })
  }
}
