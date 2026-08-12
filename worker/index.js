export default {
  async fetch() {
    return new Response('ACTS Portal Worker is running.\n', {
      headers: {
        'content-type': 'text/plain; charset=UTF-8',
      },
    });
  },
};
