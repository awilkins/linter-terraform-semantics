'use babel';
/* @flow */

import { lint } from './awstags/awstagrule';

export default {

  activate() {

  },

  deactivate() {
    
  },
  
  provideLinter() {
    return {
      name: 'Tflint',
      scope: 'file',
      lintsOnChange: false,
      grammarScopes: ['source.terraform'],
      lint: lint
    };
  }

};
