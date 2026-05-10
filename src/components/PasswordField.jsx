import React, { useState } from "react";
import { LockIcon } from "./icons";
import "../AdminStyle.css";

const PasswordField = ({
label,
value,
onChange,
confirmValue,
showMatch = false
}) => {

const [showPw, setShowPw] = useState(false);

const hasUpper = /[A-Z]/.test(value);
const hasNumber = /[0-9]/.test(value);
const hasLength = value.length >= 8;

const score = [hasUpper, hasNumber, hasLength].filter(Boolean).length;

const strength = ["Weak", "Fair", "Strong"][score - 1];
const strengthColor = ["#d9534f", "#f0ad4e", "#28a745"][score - 1];

return ( <div className="field full-width">

```
  <label className="labelSignup">
    {label} <span className="req">*</span>
  </label>

  <div className="input-wrap">

    {LockIcon}

    <input
      type={showPw ? "text" : "password"}
      placeholder="At least 8 characters"
      value={value}
      onChange={onChange}
      required
    />

    <button
      type="button"
      className="toggle-password"
      onClick={() => setShowPw(!showPw)}
    >
      👁
    </button>

  </div>

  {/* Strength meter */}
  <div className="password-strength">
    <div
      className="strength-bar"
      style={{
        width: `${score * 33}%`,
        background: strengthColor
      }}
    ></div>
  </div>

  <small className="strength-text" style={{ color: strengthColor }}>
    {strength}
  </small>

  <div className={`pw-rule ${hasLength ? "pass" : ""}`}>
    <span className="rule-dot"></span> At least 8 characters
  </div>

  <div className={`pw-rule ${hasUpper ? "pass" : ""}`}>
    <span className="rule-dot"></span> One uppercase letter
  </div>

  <div className={`pw-rule ${hasNumber ? "pass" : ""}`}>
    <span className="rule-dot"></span> One number
  </div>

  {/* Match check */}
  {showMatch && confirmValue && (
    <small
      className="match-text"
      style={{
        color:
          confirmValue === value
            ? "#28a745"
            : "#d9534f"
      }}
    >
      {confirmValue === value
        ? "Passwords match"
        : "Passwords do not match"}
    </small>
  )}

</div>

);
};

export default PasswordField;