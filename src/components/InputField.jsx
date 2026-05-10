import React from "react";
import "../AdminStyle.css";

const InputField = ({
  label,
  required,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  fullWidth,
  children
}) => {
  return (
    <div className={`field ${fullWidth ? "full-width" : ""}`}>

      <label className="labelSignup">
        {label} {required && <span className="req">*</span>}
      </label>

      <div className="input-wrap">

        {icon}

        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
        />

        {children}

      </div>

    </div>
  );
};

export default InputField;