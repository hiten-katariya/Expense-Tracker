const fs = require('fs');
let c = fs.readFileSync('src/hooks/useQueries.ts', 'utf8');
c = c.replace(/queryClient\.invalidateQueries\(\{ queryKey: \['monthly-summary'\] \}\);/g, 
  "queryClient.invalidateQueries({ queryKey: ['monthly-summary'] });\n      queryClient.invalidateQueries({ queryKey: ['notifications'] });"
);
fs.writeFileSync('src/hooks/useQueries.ts', c);
