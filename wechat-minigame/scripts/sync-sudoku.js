'use strict';
// Generated runtime copies only. Edit the shared sudoku/ source, never vendor/.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'), output=path.join(root,'wechat-minigame/vendor/sudoku');
const files=['rules.js','session-state.js','game-session.js','presentation.js','layout.js','overlays.js','controller.js','renderer.js'];
const check=process.argv.includes('--check');
if(!check)fs.mkdirSync(output,{recursive:true});
const stale=[];
for(const file of files){const source=path.join(root,'sudoku',file),target=path.join(output,file);if(check){if(!fs.existsSync(target)||!fs.readFileSync(source).equals(fs.readFileSync(target)))stale.push(file);}else fs.copyFileSync(source,target);}
if(stale.length){console.error('Unsynced Sudoku modules: '+stale.join(', '));process.exit(1);}
console.log(check?'Sudoku shared copies are current.':'Synced '+files.length+' Sudoku shared modules.');
