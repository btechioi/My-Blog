import yamlConfig from '../../config/site.yaml';

// { 'Essays': 'life' }
export const categoryMap: { [name: string]: string } = yamlConfig.categoryMap || {};
