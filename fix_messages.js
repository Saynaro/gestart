const fs = require('fs');

const jsxPath = '/Users/sainarokhalid/Desktop/Project CRM/client/src/MessagesPage/MessagesPage.jsx';
let content = fs.readFileSync(jsxPath, 'utf8');

// 1. Insert formatMessageGroupDate helper
if (!content.includes('const formatMessageGroupDate')) {
    const helperRegex = /const formatMsgTime = \([^)]+\) => \{[\s\S]*?\};/;
    const newHelper = `
  const formatMessageGroupDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
    
    if (isToday) return "Aujourd'hui";
    if (isYesterday) return "Hier";
    
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    let formatted = new Intl.DateTimeFormat('fr-FR', options).format(date);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };
`;
    content = content.replace(helperRegex, match => match + "\n" + newHelper);
}

// 2. Wrap messages.map
if (content.includes('messages.map((msg, idx) => {') && !content.includes('const grouped = [];')) {
    content = content.replace('messages.map((msg, idx) => {', `(() => {
            const grouped = [];
            let currentGroup = { date: null, messages: [] };

            messages.forEach((msg, idx) => {
              const dateStr = formatMessageGroupDate(msg.createdAt || msg.time);
              if (dateStr !== currentGroup.date) {
                if (currentGroup.messages.length > 0) {
                   grouped.push(currentGroup);
                }
                currentGroup = { date: dateStr, messages: [ {msg, idx} ] };
              } else {
                currentGroup.messages.push({msg, idx});
              }
            });
            if (currentGroup.messages.length > 0) {
              grouped.push(currentGroup);
            }

            return grouped.map((group, groupIdx) => (
              <div key={\`date-group-\${groupIdx}\`} className="message-date-group">
                <div className="sticky top-2 z-10 flex justify-center mb-4 mt-2">
                  <span className="date-separator-pill">
                    {group.date}
                  </span>
                </div>
                {group.messages.map(({msg, idx}) => {`);

    // Replace the end of the map
    const endSearch = `              </div>
            );
          })
        )}
      </div>`;
    const endReplace = `              </div>
            );
          })}
          </div>
        ));
      })()
        )}
      </div>`;
    content = content.replace(endSearch, endReplace);
}

fs.writeFileSync(jsxPath, content);

// 3. Fix CSS max-width and date separator pill
const cssPath = '/Users/sainarokhalid/Desktop/Project CRM/client/src/MessagesPage/MessagesPage.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Append new CSS rules for mobile max width override and date separator pill
const newCSS = `

/* OVERRIDES FOR MOBILE WIDTH */
@media (max-width: 768px) {
    .message-bubble-wrapper.me .message-bubble,
    .message-bubble-wrapper.me .email-bubble-card,
    .message-bubble-wrapper.me .whatsapp-bubble-card,
    .message-bubble-wrapper.me .file-attachment-bubble,
    .message-bubble-wrapper.them .message-bubble,
    .message-bubble-wrapper.them .email-bubble-card,
    .message-bubble-wrapper.them .whatsapp-bubble-card,
    .message-bubble-wrapper.them .file-attachment-bubble,
    .message-bubble,
    .email-bubble-card,
    .whatsapp-bubble-card,
    .file-attachment-bubble {
        max-width: 75% !important;
        width: fit-content !important;
    }
}

/* STICKY DATE SEPARATOR */
.message-date-group {
    display: flex;
    flex-direction: column;
}

.date-separator-pill {
    background-color: rgba(0, 0, 0, 0.25);
    color: #ffffff;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.dark .date-separator-pill {
    background-color: rgba(255, 255, 255, 0.15);
}
`;

if (!cssContent.includes('.date-separator-pill')) {
    fs.writeFileSync(cssPath, cssContent + newCSS);
}

