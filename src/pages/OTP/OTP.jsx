import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function OTP() {
  const location = useLocation();
  const navigate = useNavigate();

  const { mobile, otp } = location.state || {}; // OTP & mobile from previous page
  const [enteredOtp, setEnteredOtp] = useState("");

  if (!mobile || !otp) {
    return (
      <div className="h-screen flex items-center justify-center bg-red-100">
        <h2 className="text-xl text-red-600 font-bold">
          ❌ Invalid Access. Go back to Login.
        </h2>
      </div>
    );
  }

  const verifyOtp = (e) => {
    e.preventDefault();

    if (Number(enteredOtp) === otp) {
      alert("✅ OTP Verified Successfully!");
      navigate("/district");
    } else {
      alert("❌ Wrong OTP! Try Again.");
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-blue-50">
      <form
        onSubmit={verifyOtp}
        className="bg-white p-6 rounded-lg shadow-md w-80 space-y-4"
      >
        <h2 className="text-2xl font-bold text-center text-blue-600">
          Verify OTP
        </h2>
        <p className="text-sm text-center text-gray-600">
          OTP sent to: <strong>{mobile}</strong>
        </p>

        <input
          type="number"
          placeholder="Enter OTP"
          value={enteredOtp}
          onChange={(e) => setEnteredOtp(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Verify OTP
        </button>
      </form>
    </div>
  );
}
