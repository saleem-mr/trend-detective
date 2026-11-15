// Engine adapter, mirroring the documented binary contract.
// The serving path calls the same binary via child_process; this module is the
// single place to swap engines (set ML_ENGINE_PATH).
const { execFile } = require('child_process');
const path = require('path');

const BIN = process.env.ML_ENGINE_PATH || path.join(__dirname, '..', 'engine', 'trend-detect');
const TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS || 60000);

// Run the engine over a directory of POWER CSVs and return the parsed JSON.
function runEngine({ dataDir, region, bbox, primary = 'albedo', gridParam = 'ALLSKY_SRF_ALB', out }) {
  const args = ['--data', dataDir, '--region', region, '--primary', primary, '--grid-param', gridParam, '--out', out];
  if (bbox) args.push('--bbox', bbox);
  return new Promise((resolve, reject) => {
    execFile(BIN, args, { timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(out);
    });
  });
}

// Contract map: the engine accepts any `date,value` series on disk, so an
// NDVI/LST/precip pipeline from Earthdata can be dropped in without code changes.
const CONTRACT = {
  inputs: ['<dir of NASA POWER CSV per point>'],
  flags: ['--data DIR', '--region NAME', '--bbox a,b,c,d', '--primary key', '--grid-param PARAM', '--predict-until YEAR', '--out FILE', '--selftest'],
  outputs: 'JSON: engine, region, variables{slope,ci,mk,hamed_rao,permutation,detectability,verdict,series,fit,anomalies,predictions}, correlations, spatial'
};

module.exports = { runEngine, CONTRACT, BIN };