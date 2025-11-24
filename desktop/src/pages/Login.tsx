import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "./config";

type LoginForm = {
  email: string;
  password: string;
};

const Login = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>();
  const [error, setError] = useState("");

  const onSubmit = async (data: LoginForm) => {
    setError(""); // clear previous errors
    try {
      const res = await axios.post(BACKEND_URL + "/auth/login", data);
      if (res.data.token) {
        const token = res.data.token;
        localStorage.setItem("token", token);
        //@ts-ignore
        if (window.electronAPI) window.electronAPI.sendTokenToPython(token);
        navigate("/dashboard");
      } else setError(res.data.msg || "Invalid credentials");
    } catch (err: any) {
      setError(
        err?.response?.data?.msg ||
        err?.message ||
        "Server error. Please try again later."
      );
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col md:flex-row bg-[#0b0b0f] text-white overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      {/* Left Section with Illustration */}
      <motion.div
        className="hidden md:flex flex-col justify-start w-1/2 relative overflow-hidden pt-3 px-10"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <img
          src="src/assets/cozy-room-login.png"
          alt="Cozy workspace"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0"></div>
        <div className="relative z-10 mt-6 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <h2 className="text-4xl font-bold text-white leading-snug">
            Ready to level up?
          </h2>
          <p className="text-lg text-white/90 tracking-wide">
            Sign in and continue the journey!
          </p>
        </div>
      </motion.div>
      {/* Right Section (Form) */}
      <motion.div
        className="flex flex-1 justify-center items-center bg-[#0b0b0f]"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <motion.div
          className="w-full max-w-md p-10 rounded-2xl"
          style={{
            backgroundColor: "#101014",
            border: "1px solid rgba(255,255,255,0.05)",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.6), 0 0 10px rgba(139,92,246,0.08)"
          }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
          <h2 className="text-center text-3xl font-extrabold mb-6 text-white">
            Login
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-zinc-300 mb-2">Email</label>
              <input
                {...register("email", { required: "Email is required" })}
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-lg px-4 py-3 bg-[#0f0f10] text-zinc-100 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/60 transition"
              />
              {errors.email && (
                <p className="text-sm mt-2 text-rose-500">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-zinc-300 mb-2">Password</label>
              <input
                {...register("password", { required: "Password is required" })}
                type="password"
                placeholder="Enter your password"
                className="w-full rounded-lg px-4 py-3 bg-[#0f0f10] text-zinc-100 border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/60 transition"
              />
              {errors.password && (
                <p className="text-sm mt-2 text-rose-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            {error && (
              <motion.p
                className="text-rose-500 text-sm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}
            <motion.button
              type="submit"
              className="w-full mt-3 py-3 rounded-lg text-white font-semibold"
              style={{
                background:
                  "linear-gradient(90deg, #6D28D9 0%, #7E22CE 50%, #8B5CF6 100%)",
                boxShadow: "0 10px 28px rgba(139,92,246,0.25)",
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              Login
            </motion.button>
          </form>
          <p className="text-center text-sm text-zinc-400 mt-6">
            Don’t have an account?{" "}
            <Link
              to="/register"
              className="text-[#A78BFA] font-medium hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
