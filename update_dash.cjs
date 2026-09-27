const fs = require('fs');
let content = fs.readFileSync('/app/applet/src/pages/UserDashboard.tsx', 'utf8');

if (!content.includes('Sun,')) {
  content = content.replace("Users\\n} from 'lucide-react';", "Users,\\n  Sun,\\n  Calendar\\n} from 'lucide-react';");
}
fs.writeFileSync('/app/applet/src/pages/UserDashboard.tsx', content);
