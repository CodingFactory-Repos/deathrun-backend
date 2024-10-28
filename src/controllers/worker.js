const { parentPort, workerData } = require('worker_threads');

const processFrame = (frame) => {
  return frame;
};

const processedFrame = processFrame(workerData.frame);

parentPort.postMessage({ frame: processedFrame, roomCode: workerData.roomCode });
