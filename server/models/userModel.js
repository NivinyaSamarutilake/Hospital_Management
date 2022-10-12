const mongoose = require('mongoose')
const validator = require('validator')
const { default: isEmail } = require('validator/lib/isemail')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A user must have a name'],
        trim: true
    },
    userID: {
        type: String,
        required: [true, 'A user must have an ID'],
        unique: true
    },
    email: {
        type: String,
        required: [true, 'User must have an email address'],
        lowercase: true,
        unique: true,
        validate: [isEmail, 'Please enter a valid email']
    },
    password: {
        type: String,
        select: false,
        required: [true, 'An account must have a password'],
        minlength: 8
    },
    confirm_password: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (el) {
                return el === this.password;
            },
            message: "passwords don't match"
        },
        select: false
    },
    role: {
        type: String,
        require: [true, 'A user must have a role'],
        enum: {
            values: ['PATIENT', 'DOCTOR', 'ADMIN'],
            message: 'User role is either DOCTOR,PATIENT OR ADMIN'
        }
    },
    passwordChangedAt: {
        type: Date
    },
    passwordResetToken: String,
    passwordResetExpires: Date
})

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12)
    this.confirm_password = undefined;
    next();
})

userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
})

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)
        return JWTTimestamp < changedTimeStamp
    }
    return false;
}

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
}

const User = mongoose.model('users', userSchema)
module.exports = User