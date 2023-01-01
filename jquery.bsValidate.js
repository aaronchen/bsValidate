/*
 * jQuery Plugin - Bootstrap Validate (bsValidate)
 *
 * Requirements:
 *   - Bootstrap 4
 *   - Need to add `novalidate` attribute to form element in order to work with Bootstrap validation
 *   - Add `bs-validate` class to input element to automatically enable bsValidate
 */

(function ($) {
  class BootstrapValidate {
    constructor(element, options) {
      this.element = element;
      this.options = options;
      this.$element = $(element);
      this.errors = [];
      this.onBlur = this.toFunction(options.onBlur);
      this.onFocus = this.toFunction(options.onFocus);
      this.onReset = this.toFunction(options.onReset);
      this.onSubmit = this.toFunction(options.onSubmit);
      this.onValid = null;
      this._timeoutId = null;

      this.addListeners();
      this.addHint();
      this.wrapOnValid();
    }

    addListeners() {
      const self = this;

      self.$element.on("input", function () {
        self.removeSpinner();

        self.reportValidity() &&
          self.onValid instanceof Function &&
          self.onValid();
      });

      self.$element.on("blur", function () {
        self.hideHint();
        self.removeInvalidFeedback();

        if (self.options.autoTrim) {
          self.trim();
        }

        self.onBlur instanceof Function && self.onBlur(self);
      });

      self.$element.on("focus", function () {
        self.showHint();

        if (self.hasErrors()) {
          self.addInvalidFeedback();
        }

        self.onFocus instanceof Function && self.onFocus(self);
      });

      self.$element.on("reset", function (event) {
        event.stopImmediatePropagation();
        self.clear();
        self.resetErrors();
        self.hideHint();
        self.removeInvalidFeedback();
        self.onReset instanceof Function && self.onReset(self);
      });

      self.$element.on("submit", function (event) {
        event.stopImmediatePropagation();

        if (self.options.autoTrim) {
          self.trim();
        }

        self.reportValidity();
        self.onSubmit instanceof Function && self.onSubmit(self);
      });
    }

    addHint() {
      const hintVisibility = this.options.hintOnFocus ? "d-none" : "";

      if (this.options.hint) {
        this.$element.after(`
          <div class="form-text ${this.options.hintClass} small ${hintVisibility} mb-0 bs-validate-hint">
            ${this.options.hint}
          </div>
        `);
      }
    }

    wrapOnValid() {
      const self = this;
      const onValid = self.toFunction(self.options.onValid);

      if (onValid instanceof Function) {
        self.onValid = function () {
          clearTimeout(self._timeoutId);
          self._timeoutId = setTimeout(function () {
            onValid(self);
          }, self.options.delay);
        };
      }
    }

    toFunction(func) {
      if (func instanceof Function) {
        return func;
      }

      if (typeof func === "string" && window[func] instanceof Function) {
        return window[func];
      }

      return undefined;
    }

    clear() {
      this.$element.val("");
    }

    val() {
      return this.$element.val();
    }

    trim() {
      this.$element.val(this.$element.val().trim());
    }

    showHint() {
      this.$element.next(".bs-validate-hint").removeClass("d-none");
    }

    hideHint() {
      if (this.options.hintOnFocus) {
        this.$element.next(".bs-validate-hint").addClass("d-none");
      }
    }

    addError(message) {
      this.errors.push(message);
    }

    hasErrors() {
      return this.errors.length > 0;
    }

    resetErrors() {
      this.errors = [];
    }

    addInvalidFeedback() {
      this.removeInvalidFeedback();

      const feedback = this.errors.reduce(function (messages, message) {
        return `${messages}<li>${message}</li>`;
      }, "");

      this.$element.addClass("is-invalid").parent().append(`
        <div class="invalid-feedback">
          <ul class="list-unstyled mb-0">
            ${feedback}
          </ul>
        </div>
      `);
    }

    removeInvalidFeedback() {
      this.$element
        .removeClass("is-invalid")
        .nextAll(".invalid-feedback")
        .remove();
    }

    checkValidity() {
      const self = this;

      self.resetErrors();

      if (self.element.checkValidity()) {
        return true;
      }

      if (self.element.validity.badInput) {
        self.addError(
          self.element.type === "number"
            ? "is not a valid number"
            : "is a bad input"
        );
      }

      if (self.element.validity.patternMismatch) {
        self.addError(
          self.options.patternMismatchErrorMessage || "is not pattern-matched"
        );
      }

      if (self.element.validity.rangeOverflow) {
        self.addError(`is over the maximum value of ${self.element.max}`);
      }

      if (self.element.validity.rangeUnderflow) {
        self.addError(`is under the minimum value of ${self.element.min}`);
      }

      if (self.element.validity.stepMismatch) {
        self.addError(`is not in the step of ${self.element.step}`);
      }

      if (self.element.validity.tooLong) {
        self.addError(
          `is over the maximum charcters of ${self.$element.attr("maxlength")}`
        );
      }

      if (self.element.validity.tooShort) {
        self.addError(
          `is under the minimum charcters of ${self.$element.attr("minlength")}`
        );
      }

      if (self.element.validity.typeMismatch) {
        self.addError(
          `is not a valid ${self.element.type.toUpperCase()} format`
        );
      }

      if (self.element.validity.valueMissing) {
        self.addError("is required");
      }

      if (!self.hasErrors()) {
        self.addError("is not valid");
      }

      return false;
    }

    reportValidity() {
      const isValid = this.checkValidity();

      if (isValid) {
        this.removeInvalidFeedback();
      } else {
        this.addInvalidFeedback();
      }

      return isValid;
    }

    showSpinner() {
      const top = this.$element.hasClass("form-control-sm") ? "-25px" : "-29px";
      this.removeSpinner();
      this.$element.after(`
        <div class="form-text bs-spinner" style="line-height: 0;">
          <div class="spinner-border spinner-border-sm ${this.options.spinnerClass} position-relative float-right"
               style="height: .8rem; width: .8rem; top: ${top}; right: 16px;"></div>
        </div>
      `);
    }

    removeSpinner() {
      this.$element.nextAll(".bs-spinner").remove();
    }
  }

  $.fn.bsValidate = function (options) {
    return this.each(function () {
      if (this.tagName === "INPUT") {
        const htmlOptions = $(this).data() || {};
        const settings = $.extend(
          {},
          $.fn.bsValidate.defaults,
          htmlOptions,
          options
        );

        new BootstrapValidate(this, settings);
      }
    });
  };

  $.fn.bsValidate.defaults = {
    // HTML attribute: data-auto-trim
    autoTrim: true,
    // HTML attribute: data-delay
    delay: 750,
    // HTML attribute: data-hint
    hint: "",
    // HTML attribute: data-hint-class
    hintClass: "text-muted",
    // HTML attribute: data-hint-on-focus
    hintOnFocus: false,
    // HTML attribute: data-on-blur
    onBlur: null,
    // HTML attribute: data-on-focus
    onFocus: null,
    // HTML attribute: data-on-reset
    onReset: null,
    // HTML attribute: data-on-submit
    onSubmit: null,
    // HTML attribute: data-on-valid
    onValid: null,
    // HTML attribute: data-pattern-mismatch-error-message
    patternMismatchErrorMessage: "",
    // HTML attribute: data-spinner-class
    spinnerClass: "text-primary",
  };

  $(function () {
    $(".bs-validate").bsValidate();
  });
})(jQuery);
