import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

type LoginForm = {
  email: string;
  password: string;
};

const Login = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();
  const [error, setError] = useState("");

  const Input = React.forwardRef(
    ({ label, type, placeholder, ...props }: any, ref: any) => (
      <div>
        {label && (
          <label className="block text-zinc-300 font-medium mb-2">{label}</label>
        )}
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-zinc-700 bg-zinc-900/60 
                     text-zinc-100 rounded-lg focus:outline-none 
                     focus:ring-2 focus:ring-purple-600 focus:border-transparent 
                     transition-all duration-200 placeholder-zinc-500"
          {...props}
        />
      </div>
    )
  );

  const Button = ({ children, ...props }: any) => (
    <button
      {...props}
      className="w-full py-2 px-4 bg-gradient-to-r from-[#7E22CE] to-[#6B21A8]
                 hover:from-[#8B5CF6] hover:to-[#7C3AED]
                 text-white font-semibold rounded-lg 
                 focus:outline-none focus:ring-2 focus:ring-purple-500 
                 transition-all duration-300 shadow-md shadow-purple-900/30"
    >
      {children}
    </button>
  );

  const Logo = () => (
    <div className="absolute top-6 left-8 flex items-center space-x-3">
      <div className="flex items-center justify-center w-10 h-10 
                      bg-gradient-to-r from-[#7E22CE] to-[#6B21A8] 
                      rounded-lg shadow-md">
        <span className="text-white font-bold text-xl">F</span>
      </div>
      <span className="text-zinc-100 text-lg font-semibold tracking-wide">
        FlowState
      </span>
    </div>
  );

  const onSubmit = (data: LoginForm) => {
    try {
      if (!data.email || !data.password) {
        setError("Please fill all fields.");
        return;
      }
      alert(`Welcome back!`);
      navigate("/");
    } catch (err) {
      setError("Something went wrong. Try again later.");
    }
  };

  return (
    <div
      className="relative flex items-center justify-center w-full min-h-screen 
                 overflow-hidden bg-[#0b0b0f] text-white"
    >
      {/* Abstract background pattern - zinc + plum tones */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-40 w-[650px] h-[650px]
                        bg-gradient-to-br from-[#2D0B45] via-[#0b0b0f] to-[#18181b]
                        rounded-full blur-3xl opacity-50 animate-pulse"></div>

        <div className="absolute bottom-0 right-0 w-[700px] h-[700px]
                        bg-gradient-to-tl from-[#3B0764] via-[#0b0b0f] to-[#1e1e23]
                        rounded-full blur-3xl opacity-40 animate-pulse"></div>

        <div className="absolute top-1/2 left-1/2 w-[900px] h-[900px]
                        bg-gradient-to-tr from-[#6B21A8]/40 via-transparent to-[#0b0b0f]
                        -translate-x-1/2 -translate-y-1/2 blur-2xl opacity-40"></div>
      </div>

      <Logo />

      <div
        className="relative z-10 mx-auto w-full max-w-md 
                   bg-zinc-900/70 backdrop-blur-md 
                   rounded-2xl p-10 border border-zinc-800/70 
                   shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <h2 className="text-center text-4xl font-bold bg-gradient-to-r from-[#A855F7] to-[#7E22CE] bg-clip-text text-transparent">
          Welcome Back
        </h2>
        <p className="mt-2 text-center text-base text-zinc-400">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-purple-400 hover:underline font-medium"
          >
            Sign Up
          </Link>
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                message: "Invalid email address",
              },
            })}
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password.message}</p>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button type="submit">Login</Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
