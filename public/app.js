(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  var statusEl = document.getElementById("form-status");
  var submitBtn = document.getElementById("submit-button");

  if (!form) {
    return;
  }

  var GENERIC_ERROR = "Sorry, something went wrong on our end. Please try again in a moment.";
  var SENDING = "Sending\u2026";
  var SUCCESS = "Thanks! Your message is on its way \u2014 we'll be in touch shortly.";

  function setStatus(message, state) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.classList.remove("is-success", "is-error");
    if (state) {
      statusEl.classList.add(state);
    }
  }

  function errorMessages(body) {
    if (!body || !body.errors) {
      return [];
    }
    var errors = body.errors;

    if (Array.isArray(errors)) {
      return errors.filter(function (item) {
        return typeof item === "string" && item.length > 0;
      });
    }

    if (typeof errors === "string") {
      return errors.length > 0 ? [errors] : [];
    }

    if (typeof errors === "object") {
      return Object.keys(errors).map(function (key) {
        var value = errors[key];
        if (Array.isArray(value)) {
          value = value.join(" ");
        }
        return String(value);
      });
    }

    return [];
  }

  function readJson(response) {
    return response
      .json()
      .catch(function () {
        return null;
      })
      .then(function (body) {
        return { response: response, body: body };
      });
  }

  function collectPayload() {
    return {
      name: form.elements.name.value,
      email: form.elements.email.value,
      company: form.elements.company.value,
      message: form.elements.message.value,
      website: form.elements.website.value
    };
  }

  function lock() {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute("aria-busy", "true");
    }
  }

  function unlock() {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.removeAttribute("aria-busy");
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (submitBtn && submitBtn.disabled) {
      return;
    }

    lock();
    setStatus(SENDING, null);

    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectPayload())
    })
      .then(readJson)
      .then(function (result) {
        var response = result.response;
        var body = result.body;

        if (response.ok && body && body.ok) {
          form.reset();
          setStatus(SUCCESS, "is-success");
          return;
        }

        if (response.status === 400) {
          var messages = errorMessages(body);
          setStatus(
            messages.length > 0
              ? messages.join(" ")
              : "Please check your details and try again.",
            "is-error"
          );
          return;
        }

        setStatus(GENERIC_ERROR, "is-error");
      })
      .catch(function () {
        setStatus(GENERIC_ERROR, "is-error");
      })
      .finally(unlock);
  });
})();
