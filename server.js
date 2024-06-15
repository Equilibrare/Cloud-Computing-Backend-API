require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const predictionRoutes = require('./routes/predict');
const saveDataRoute = require('./routes/saveData');
const errorHandler = require('./utils/errorHandler');

const serviceAccount = require('./credentials.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "equilibrare-425011.appspot.com",
  databaseURL: "https://equilibrare-425011-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/predict', predictionRoutes);
app.use('/saveData', saveDataRoute);

app.use(errorHandler);

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

