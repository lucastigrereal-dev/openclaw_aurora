const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

test('Health endpoint deve retornar 200', async () => {
  const res = await fetch(`http://localhost:${process.env.PORT || 3000}/health`);
  if (res.status !== 200) {
    throw new Error(`Esperado 200, mas recebeu ${res.status}`);
  }
});
