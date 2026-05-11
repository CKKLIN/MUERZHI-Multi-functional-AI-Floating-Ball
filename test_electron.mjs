import electron from 'electron';
console.log('type:', typeof electron);
console.log('app:', typeof electron?.app);
console.log('keys:', Object.keys(electron).slice(0,10));
