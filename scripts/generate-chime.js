const fs = require('fs');
const path = require('path');

function generateChimeWav() {
  const sampleRate = 44100;
  const duration = 0.8; // seconds
  const totalSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = totalSamples * bytesPerSample;

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Two harmonic notes: C5 (523.25 Hz) transitioning to G5 (783.99 Hz)
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (t < 0.25) {
      // First chime note
      const env = Math.exp(-t * 6);
      sample = Math.sin(2 * Math.PI * 523.25 * t) * 0.4 * env;
    } else {
      // Second chime note
      const t2 = t - 0.25;
      const env = Math.exp(-t2 * 4.5);
      sample = (Math.sin(2 * Math.PI * 659.25 * t2) * 0.4 + Math.sin(2 * Math.PI * 783.99 * t2) * 0.2) * env;
    }

    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  const outPath = path.join(__dirname, '../assets/chime.wav');
  fs.writeFileSync(outPath, buffer);
  console.log('Generated chime.wav, size:', buffer.length);
}

generateChimeWav();
