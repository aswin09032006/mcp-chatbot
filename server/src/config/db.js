const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI.replace('localhost', '127.0.0.1');
    await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${uri}`);
  } catch (err) {
    console.error(`MongoDB Connection Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
