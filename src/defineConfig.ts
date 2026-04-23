import {LincdConfig} from './interfaces';

/**
 * Define a LINCD configuration with type checking and autocomplete
 * @param config The configuration object
 * @returns The same configuration object (identity function for type inference)
 */
export function defineConfig(config: LincdConfig): LincdConfig {
  return config;
}

