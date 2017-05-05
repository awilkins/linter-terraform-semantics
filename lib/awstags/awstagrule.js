/* @flow */
'use babel';

import { exec } from 'child_process';
import { TextEditor } from 'atom';
import { taggableResources } from './taggable-resources';
import fs from 'fs';

function getResourceRanges(textEditor) {
  
  const resourceExp = /^resource\s+"([\w_]+)"\s+"([\w_-]+)"\s+{/g;
  
  let ranges = {};
  
  textEditor.getBuffer().scan(resourceExp, (hit) => {
    let key = `${hit.match[1]}+${hit.match[2]}`;
    ranges[key] = hit.range;
  });
  
  return ranges;
}

function linterError(editorPath, range, excerpt, description) {
  if(!range) {
    throw new Error();
  }
  let error = {
    severity: 'warning',
    location: {
      file: editorPath,
      position: range
    },
    excerpt: excerpt,
    description: description
  };
  return error;
}

function getConfig(editorPath) {
  let projectPath = atom.project.relativizePath(editorPath)[0];
  let configPath = `${projectPath}/.tflint.json`;
  let config = null;
  if(fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return config;
}

function checkResource(config, resource, ranges, editorPath) {
  let resourceType = Object.keys(resource)[0];
  
  if(!taggableResources.includes(resourceType)) return [];
  
  let errors = [];
  let tagConfig = config.tags;
  
  Object.keys(tagConfig).some((resourcePattern:String) => {
    let resourceName = Object.keys(resource[resourceType][0])[0];
    if(resourceType.match(resourcePattern)) {
      let resourceTagConfig = tagConfig[resourcePattern];
      let realResource = resource[resourceType][0][resourceName];
      let key = `${resourceType}+${resourceName}`;
      let range = ranges[key];
      
      Object.keys(resourceTagConfig).some((item) => {
        if(!realResource[0].tags) {
          errors.push(linterError(editorPath, range, `No tags defined on [${resourceType}/${resourceName}]`));
          return true;
        }
        
        if(realResource[0].tags[0][item] === undefined) {
          errors.push(linterError(editorPath, range, `Tag missing on [${resourceType}/${resourceName}] : [${item}]`));
        } else {
          let tagValue: string = realResource[0].tags[0][item];
          let pattern = resourceTagConfig[item];
          if(!String(tagValue).match(pattern)) {
            errors.push(linterError(editorPath, range, `Tag value for [${item}] doesn't match pattern [${pattern}]`));
          }
        }
      });
    }
  });
  
  return errors;
}

exports.lint = (textEditor: TextEditor) => {
  let editorPath: string = textEditor.getPath();
  if(!editorPath) return;
  
  let config = getConfig(editorPath);
  if(!config) return [];
  
  let ranges = getResourceRanges(textEditor);
  
  return new Promise(resolve => {
    exec(`json2hcl -reverse < '${textEditor.getPath()}'`, (err, stdout) => {
      let terraformObject = JSON.parse(stdout);
      if (terraformObject.resource) {
        let errorList = [].concat(...terraformObject.resource.map(item => checkResource(config, item, ranges, editorPath)).filter(n => { return n !== undefined; } ));
        resolve(errorList);
      } else {
        resolve([]);
      }
    });
  });
};
