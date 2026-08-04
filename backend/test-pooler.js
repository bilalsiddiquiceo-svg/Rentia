const net = require('net');

const regions = [
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-0-us-west-1.pooler.supabase.com',
  'aws-0-us-west-2.pooler.supabase.com',
  'aws-0-eu-central-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-0-ap-southeast-1.pooler.supabase.com',
  'aws-0-sa-east-1.pooler.supabase.com',
  'aws-0-ap-south-1.pooler.supabase.com',
];

const ref = 'taakpyrawxzemejobtke';
const pass = 'XjW1bhhwJx5L3GQA';

async function testHost(host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(2000);
    socket.on('connect', () => {
      console.log(`SUCCESS: Connected to ${host}`);
      socket.destroy();
      resolve(host);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(null);
    });
    socket.connect(6543, host);
  });
}

async function run() {
  console.log('Testing Supabase Pooler Regions...');
  for (const host of regions) {
    const res = await testHost(host);
    if (res) {
      console.log(`FOUND WORKING POOLER HOST: ${res}`);
      console.log(`URL: postgresql://postgres.${ref}:${pass}@${res}:6543/postgres`);
      break;
    }
  }
}

run();
