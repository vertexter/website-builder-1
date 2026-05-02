const fs = require('fs');
const path = require('path');
const { supabaseRequest } = require('../db/supabase');

async function exportPpt(presentationId) {
  const slides = await supabaseRequest(`/rest/v1/slides?presentation_id=eq.${presentationId}&select=title,content,layout_type&id=order.asc`);
  const outDir = '/tmp/pitchai'; fs.mkdirSync(outDir,{recursive:true});
  const outFile = path.join(outDir, `${presentationId}.pptx`);
  const payload = { generated_at: new Date().toISOString(), slides };
  fs.writeFileSync(outFile.replace('.pptx','.json'), JSON.stringify(payload,null,2));
  fs.writeFileSync(outFile, 'Install pptxgenjs dependency in deployment image to render actual PPTX.');
  return outFile;
}

module.exports = { exportPpt };
