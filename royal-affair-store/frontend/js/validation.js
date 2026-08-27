/* Universal Form Validation for Royal Affair - Designer Suits */

// Validator RegEx and Matchers
const validators = {
  required: (val) => val.trim().length > 0,
  fullname: (val) => val.trim().length >= 3 && /^[a-zA-Z\s]+$/.test(val.trim()),
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()),
  phone: (val) => /^[6789]\d{9}$/.test(val.trim()),
  pincode: (val) => /^[1-9]\d{5}$/.test(val.trim()),
  password: (val) => val.length >= 6,
  address: (val) => val.trim().length >= 8,
  coupon: (val) => ["ROYAL10", "FIRST200", "FREESHIP"].includes(val.trim().toUpperCase())
};

// Helper: Get form-group wrapper or fallback to parent
function getGroupContainer(input) {
  return input.closest(".form-group") || input.parentElement;
}

// Helper: Display validation error
function showInputError(input, message) {
  const group = getGroupContainer(input);
  if (!group) return;

  group.classList.add("invalid");
  group.classList.remove("success");

  // Set ARIA attributes
  input.setAttribute("aria-invalid", "true");

  let errorSpan = group.querySelector(".form-error-msg");
  if (!errorSpan) {
    // Dynamically build error message container if missing
    errorSpan = document.createElement("span");
    errorSpan.className = "form-error-msg";
    errorSpan.style.color = "var(--color-error)";
    errorSpan.style.fontSize = "0.75rem";
    errorSpan.style.display = "block";
    errorSpan.style.marginTop = "0.25rem";
    errorSpan.style.fontWeight = "500";
    group.appendChild(errorSpan);
  }

  // Setup unique error ID for describedby accessibility
  if (!errorSpan.id) {
    errorSpan.id = `${input.id || "input"}-error-msg`;
  }
  input.setAttribute("aria-describedby", errorSpan.id);
  errorSpan.textContent = message;
  errorSpan.style.display = "block";
}

// Helper: Display validation success
function showInputSuccess(input) {
  const group = getGroupContainer(input);
  if (!group) return;

  group.classList.remove("invalid");
  group.classList.add("success");

  // Set ARIA attributes
  input.setAttribute("aria-invalid", "false");

  const errorSpan = group.querySelector(".form-error-msg");
  if (errorSpan) {
    errorSpan.textContent = "";
    errorSpan.style.display = "none";
  }
}

// Helper: Clear validation styles
function clearInputState(input) {
  const group = getGroupContainer(input);
  if (!group) return;

  group.classList.remove("invalid");
  group.classList.remove("success");

  input.setAttribute("aria-invalid", "false");

  const errorSpan = group.querySelector(".form-error-msg");
  if (errorSpan) {
    errorSpan.textContent = "";
    errorSpan.style.display = "none";
  }
}

// Validate individual field
function validateField(input) {
  // If element is hidden or disabled, skip validation
  if (input.offsetWidth === 0 && input.offsetHeight === 0) return true;
  if (input.disabled) return true;

  const val = input.type === "checkbox" ? input.checked : input.value;
  const isRequired = input.hasAttribute("required");

  // Reset state
  clearInputState(input);

  // Check required fields
  if (isRequired) {
    if (input.type === "checkbox" && !val) {
      showInputError(input, "You must agree to the terms to proceed.");
      return false;
    }
    if (typeof val === "string" && val.trim() === "") {
      showInputError(input, "This field is required.");
      return false;
    }
  }

  // If empty and not required, it is valid
  if (typeof val === "string" && val.trim() === "") {
    return true;
  }

  // Name validation
  if (input.id.includes("name") || input.name === "fullname" || input.id === "register-name") {
    if (!validators.fullname(val)) {
      showInputError(input, "Name must be at least 3 characters and contain letters only.");
      return false;
    }
  }

  // Email validation
  if (input.type === "email" || input.id.includes("email") || input.name === "email") {
    if (!validators.email(val)) {
      showInputError(input, "Please enter a valid email address.");
      return false;
    }
  }

  // Phone validation
  if (input.type === "tel" || input.name === "phone" || input.id.includes("phone")) {
    if (!validators.phone(val)) {
      showInputError(input, "Please enter a valid 10-digit Indian phone number starting with 6-9.");
      return false;
    }
  }

  // PIN code validation. Match PIN as a complete field-name token; a broad
  // `includes("pin")` also matched every `shipping-*` checkout field.
  const fieldIdentity = `${input.id || ""} ${input.name || ""}`.toLowerCase();
  const isPinCodeField = /(^|[-_\s])(pin|pincode|postal|postalcode|postal_code)(?=[-_\s]|$)/.test(fieldIdentity);
  if (isPinCodeField) {
    if (!validators.pincode(val)) {
      showInputError(input, "Please enter a valid 6-digit Indian PIN code.");
      return false;
    }
  }

  // Password validation
  if (input.type === "password" || input.name === "password") {
    if (input.id.includes("confirm")) {
      const mainPassword = document.querySelector('input[type="password"]:not([id*="confirm"])');
      if (mainPassword && val !== mainPassword.value) {
        showInputError(input, "Passwords do not match.");
        return false;
      }
    } else {
      if (!validators.password(val)) {
        showInputError(input, "Password must be at least 6 characters.");
        return false;
      }
    }
  }

  // Address validation
  if (input.name.includes("address") || input.id.includes("address") || input.id.includes("line")) {
    if (!validators.address(val)) {
      showInputError(input, "Address must be at least 8 characters long.");
      return false;
    }
  }

  // Coupon validation
  if (input.id.includes("coupon") || input.name === "coupon") {
    if (!validators.coupon(val)) {
      showInputError(input, "Invalid coupon code.");
      return false;
    }
  }

  showInputSuccess(input);
  return true;
}

// Validate entire form
function validateForm(form) {
  let isValid = true;
  let firstInvalid = null;

  const fields = form.querySelectorAll("input, select, textarea");
  fields.forEach(field => {
    if (field.type === "submit" || field.type === "button") return;

    const fieldValid = validateField(field);
    if (!fieldValid) {
      isValid = false;
      if (!firstInvalid) {
        firstInvalid = field;
      }
    }
  });

  if (firstInvalid) {
    firstInvalid.focus();
  }

  return isValid;
}

// Auto init on DOM load
document.addEventListener("DOMContentLoaded", () => {
  const forms = document.querySelectorAll("form");
  forms.forEach(form => {
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach(input => {
      // Validate on blur
      input.addEventListener("blur", () => {
        validateField(input);
      });

      // Live correction support
      input.addEventListener("input", () => {
        const group = getGroupContainer(input);
        if (group && group.classList.contains("invalid")) {
          validateField(input);
        }
      });
    });

    // Handle submissions
    form.addEventListener("submit", (e) => {
      // Skip forms with search or simple newsletter
      if (form.classList.contains("newsletter-form") || form.className.includes("search")) {
        return;
      }

      const isValid = validateForm(form);
      if (!isValid) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });
});
