import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function CountrySelect({
  options,
  value,
  onChange,
  name,
  hasError = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.iso === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (iso) => {
    onChange({
      target: {
        name,
        value: iso,
      },
    });
    setOpen(false);
  };

  return (
    <div className={`country-select ${hasError ? "input-error" : ""}`} ref={rootRef}>
      <button
        type="button"
        className={`country-select-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="country-select-value">
          <span className="country-label">{selectedOption.name}</span>
          <span className="country-dial-code">{selectedOption.dialCode}</span>
        </span>
        <ChevronDown size={18} className="country-select-chevron" />
      </button>

      {open && (
        <div className="country-select-menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              key={option.iso}
              className={`country-select-option ${option.iso === value ? "selected" : ""}`}
              onClick={() => handleSelect(option.iso)}
              role="option"
              aria-selected={option.iso === value}
            >
              <span className="country-label">{option.name}</span>
              <span className="country-dial-code">{option.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
