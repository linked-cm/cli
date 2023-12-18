module.exports = {
  apps: [
    {
      name: '${hyphen_name}-staging',
      script: 'yarn run server:staging',
      time: true,
      log_date_format: 'DD-MM-YYYY HH:mm Z',
      out_file: './data/out.log',
      error_file: './data/error.log',
    },
  ],
};
