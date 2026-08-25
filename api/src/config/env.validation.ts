import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  HOST: Joi.alternatives()
    .try(Joi.string().ip(), Joi.string().hostname())
    .default('0.0.0.0'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  CLERK_SECRET_KEY: Joi.string().min(1).required(),
  CLERK_AUTHORIZED_PARTIES: Joi.string().min(1).required(),
  DINO_OPERATOR_ID: Joi.string().min(1).required(),
});
