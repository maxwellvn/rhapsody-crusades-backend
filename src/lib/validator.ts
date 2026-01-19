export class Validator {
  private data: Record<string, unknown>;
  private errorMessages: Record<string, string> = {};
  private validatedData: Record<string, unknown> = {};

  constructor(data: Record<string, unknown>) {
    this.data = data;
  }

  required(field: string, message?: string): this {
    const value = this.data[field];
    if (value === undefined || value === null || value === '') {
      this.errorMessages[field] = message || `${field} is required`;
    } else {
      this.validatedData[field] = this.sanitize(value);
    }
    return this;
  }

  optional(field: string): this {
    const value = this.data[field];
    if (value !== undefined && value !== null && value !== '') {
      this.validatedData[field] = this.sanitize(value);
    }
    return this;
  }

  email(field: string, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.errorMessages[field] = message || 'Invalid email format';
      }
    }
    return this;
  }

  minLength(field: string, length: number, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string' && value.length < length) {
      this.errorMessages[field] = message || `${field} must be at least ${length} characters`;
    }
    return this;
  }

  maxLength(field: string, length: number, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string' && value.length > length) {
      this.errorMessages[field] = message || `${field} must be at most ${length} characters`;
    }
    return this;
  }

  phone(field: string, message?: string): this {
    const value = this.data[field];
    if (value && typeof value === 'string') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        this.errorMessages[field] = message || 'Invalid phone number';
      }
    }
    return this;
  }

  confirmed(field: string, confirmField: string, message?: string): this {
    const value = this.data[field];
    const confirmValue = this.data[confirmField];
    if (value !== confirmValue) {
      this.errorMessages[field] = message || `${field} confirmation does not match`;
    }
    return this;
  }

  numeric(field: string, message?: string): this {
    const value = this.data[field];
    if (value !== undefined && value !== null && isNaN(Number(value))) {
      this.errorMessages[field] = message || `${field} must be a number`;
    }
    return this;
  }

  min(field: string, minValue: number, message?: string): this {
    const value = Number(this.data[field]);
    if (!isNaN(value) && value < minValue) {
      this.errorMessages[field] = message || `${field} must be at least ${minValue}`;
    }
    return this;
  }

  max(field: string, maxValue: number, message?: string): this {
    const value = Number(this.data[field]);
    if (!isNaN(value) && value > maxValue) {
      this.errorMessages[field] = message || `${field} must be at most ${maxValue}`;
    }
    return this;
  }

  in(field: string, values: string[], message?: string): this {
    const value = this.data[field];
    if (value && !values.includes(String(value))) {
      this.errorMessages[field] = message || `${field} must be one of: ${values.join(', ')}`;
    }
    return this;
  }

  custom(field: string, callback: (value: unknown) => boolean, message: string): this {
    const value = this.data[field];
    if (!callback(value)) {
      this.errorMessages[field] = message;
    }
    return this;
  }

  passes(): boolean {
    return Object.keys(this.errorMessages).length === 0;
  }

  fails(): boolean {
    return !this.passes();
  }

  errors(): Record<string, string> {
    return this.errorMessages;
  }

  validated(): Record<string, unknown> {
    return this.validatedData;
  }

  private sanitize(value: unknown): unknown {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }
}

export function validate(data: Record<string, unknown>): Validator {
  return new Validator(data);
}
