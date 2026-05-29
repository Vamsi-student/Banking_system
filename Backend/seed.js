import { configDotenv } from "dotenv";
configDotenv();

import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import mongoose from "mongoose";
import { connectdb } from "./src/config/database.js";
import userModel from "./src/models/user.model.js";
import accountModel from "./src/models/account.model.js";

async function seed() {
  await connectdb();

  const existing = await userModel
    .findOne({ systemUser: true })
    .select("+systemUser");

  if (existing) {
    console.log("System user already exists:");
    console.log("  Email:    ", existing.email);
    console.log("  User ID:  ", existing._id);
    await mongoose.disconnect();
    return;
  }

  const user = await userModel.create({
    email: "system@bankapp.dev",
    name: "System Account",
    password: "System@123",
    systemUser: true,
  });

  const account = await accountModel.create({
    user: user._id,
    balance: 1000000,
    currency: "INR",
  });

  console.log("System user created:");
  console.log("  Email:    system@bankapp.dev");
  console.log("  Password: System@123");
  console.log("  User ID:  ", user._id);
  console.log("  Account ID:", account._id);
  console.log("  Balance:  ₹10,00,000");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
