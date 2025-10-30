import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState(null);

  const sendOTP = (e) => {
    e.preventDefault();

    // Generate random 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000);
    setGeneratedOtp(otp);

    alert(`Your OTP (for testing): ${otp}`);

    // Navigate with OTP & mobile number
    navigate("/otp", { state: { mobile, otp } });
  };

  return (
    <div className="h-screen flex items-center justify-center bg-blue-100">
      <form
        onSubmit={sendOTP}
        className="bg-white p-6 rounded-lg shadow-md w-80 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center text-blue-600">
          Welcome 👋
        </h2>
        <p className="text-sm text-center text-gray-600">
          Enter your mobile number to continue
        </p>

        <input
          type="tel"
          placeholder="10-digit Mobile Number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full p-2 border rounded"
          required
          pattern="[0-9]{10}"
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Send OTP
        </button>
      </form>
    </div>
  );
}
