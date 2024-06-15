const { spawn } = require('child_process');
const admin = require('firebase-admin');

// Predict function
const predict = async (req, res) => {
  const idToken = req.headers.authorization.split('Bearer ')[1];
  const { text } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const process = spawn('python3', ['preprocessing.py', text]);

    let resultBuffer = [];
    let errorBuffer = [];

    process.stdout.on('data', (data) => {
      resultBuffer.push(data);
    });

    process.stderr.on('data', (data) => {
      errorBuffer.push(data);
      console.error(`stderr: ${data}`);
    });

    process.on('close', async (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code !== 0) {
        const errorOutput = Buffer.concat(errorBuffer).toString();
        console.error(`Python script error: ${errorOutput}`);
        res.status(500).send({ error: errorOutput.trim() });
        return;
      }

      const resultOutput = Buffer.concat(resultBuffer).toString();
      console.log(`Raw result from Python script: ${resultOutput}`);

      try {
        const trimmedResult = resultOutput.trim();
        console.log(`Trimmed result: ${trimmedResult}`);

        // Check if the result is valid JSON
        const jsonStart = trimmedResult.indexOf('{');
        const jsonEnd = trimmedResult.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonStart < jsonEnd) {
          const jsonString = trimmedResult.substring(jsonStart, jsonEnd + 1);
          console.log(`Extracted JSON string: ${jsonString}`);

          const predictionResult = JSON.parse(jsonString);
          const { prediction_result, result: label } = predictionResult;

          const db = admin.firestore();
          await db.collection('predictions').add({
            uid: uid,
            text: text,
            prediction: prediction_result,
            label: label,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });

          res.json({ prediction: prediction_result, label: label });
        } else {
          throw new Error('Invalid JSON format');
        }
      } catch (error) {
        console.error('Error parsing JSON from predict script:', error);
        console.error(`Raw output: ${resultOutput}`);
        res.status(500).send({ error: error.message });
      }
    });

    process.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      res.status(500).send({ error: err.message });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

// Get histories
const getHistories = async (req, res) => {
  const idToken = req.headers.authorization.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const db = admin.firestore();
    const querySnapshot = await db.collection('predictions').where('uid', '==', uid).orderBy('timestamp', 'desc').limit(10).get();

    const histories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(histories);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
};

module.exports = {
  predict,
  getHistories,
};
