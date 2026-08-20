const BRAND_COLOR = '#2DB17B';
const BRAND_DARK  = '#1a6e4d';
const BG          = '#f4f7f6';
const CARD_BG     = '#ffffff';
const TEXT_DARK   = '#1a202c';
const TEXT_MUTED  = '#6b7280';
const BORDER      = '#e5e7eb';

const wrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>3Sense Barangay Notification</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,${BRAND_DARK} 100%);
                        border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
              <div style="font-size:13px;font-weight:700;letter-spacing:3px;
                          color:rgba(255,255,255,0.75);text-transform:uppercase;
                          margin-bottom:6px;">Barangay 3Sense</div>
              <div style="font-size:24px;font-weight:800;color:#fff;">Official Notification</div>
            </td>
          </tr>
          <tr>
            <td style="background:${CARD_BG};padding:32px;border-left:1px solid ${BORDER};
                        border-right:1px solid ${BORDER};">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border:1px solid ${BORDER};
                        border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};line-height:1.6;">
                This is an official notification from <strong>Barangay 3Sense</strong>.<br/>
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const badge = (text, bg = '#e0f7ef', color = BRAND_DARK) =>
  `<span style="display:inline-block;padding:3px 12px;border-radius:20px;
    font-size:12px;font-weight:700;background:${bg};color:${color};
    letter-spacing:0.5px;">${text}</span>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid ${BORDER};margin:20px 0;" />`;

const infoRow = (label, value) => value
  ? `<tr>
      <td style="padding:6px 0;width:130px;font-size:13px;color:${TEXT_MUTED};
                  font-weight:600;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;font-size:13px;color:${TEXT_DARK};vertical-align:top;">${value}</td>
    </tr>`
  : '';

export function buildAnnouncementEmail(announcement) {
  const {
    title = 'Announcement',
    description = '',
    category = 'All Residents',
    announcementCategory = 'General',
    location = '',
    time = '',
    requirements = [],
    postedBy = 'Barangay Admin',
  } = announcement;

  const isGeneral = !category || category.trim().toLowerCase() === 'all residents';
  const audienceBadge = isGeneral
    ? badge('All Residents', '#e0e7ff', '#3730a3')
    : badge(category, '#fef3c7', '#92400e');

  const formattedTime = time
    ? (() => { try { return new Date(time).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }); } catch { return time; } })()
    : '';

  const reqList = requirements.filter(Boolean);

  const content = `
    <div style="margin-bottom:6px;">${audienceBadge} &nbsp; ${badge(announcementCategory, '#f0f9ff', '#0369a1')}</div>
    <h1 style="margin:16px 0 0;font-size:22px;font-weight:800;color:${TEXT_DARK};line-height:1.3;">${title}</h1>
    ${divider()}
    <p style="margin:0 0 20px;font-size:15px;color:${TEXT_DARK};line-height:1.7;">${description.replace(/\n/g, '<br/>')}</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
      ${infoRow('Location', location || 'TBA')}
      ${formattedTime ? infoRow('Date &amp; Time', formattedTime) : ''}
      ${infoRow('Target Audience', category)}
      ${infoRow('Posted By', postedBy)}
    </table>
    ${reqList.length > 0 ? `
    <div style="background:#f9fafb;border:1px solid ${BORDER};border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:${TEXT_DARK};margin-bottom:10px;">Requirements</div>
      <ul style="margin:0;padding-left:20px;">
        ${reqList.map(r => `<li style="font-size:13px;color:${TEXT_DARK};margin-bottom:4px;">${r}</li>`).join('')}
      </ul>
    </div>` : ''}
    <div style="background:${BG};border-radius:8px;padding:14px 18px;text-align:center;">
      <p style="margin:0;font-size:13px;color:${TEXT_MUTED};">
        For questions, please visit the <strong>Barangay Hall</strong> or contact your barangay officials.
      </p>
    </div>
  `;

  return wrapper(content);
}

export function buildProgramEmail(program) {
  const {
    title = 'Program',
    description = '',
    date = '',
    endDate = '',
    startTime = '',
    endTime = '',
    location = '',
    demographic = '',
    slots = '',
    requirements = [],
  } = program;

  const dateRange = endDate && endDate !== date ? `${date} - ${endDate}` : date;
  const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : startTime;
  const reqList = requirements.filter(Boolean);

  const content = `
    <div style="margin-bottom:6px;">${badge('Barangay Program', '#e0e7ff', '#3730a3')}</div>
    <h1 style="margin:16px 0 0;font-size:22px;font-weight:800;color:${TEXT_DARK};line-height:1.3;">${title}</h1>
    ${divider()}
    <p style="margin:0 0 20px;font-size:15px;color:${TEXT_DARK};line-height:1.7;">${description.replace(/\n/g, '<br/>')}</p>
    <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);
                border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:${BRAND_DARK};margin-bottom:12px;">Program Details</div>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow('Date', dateRange || 'TBA')}
        ${timeRange ? infoRow('Time', timeRange) : ''}
        ${infoRow('Location', location || 'TBA')}
        ${demographic ? infoRow('Target', demographic) : ''}
        ${slots ? infoRow('Slots', String(slots)) : ''}
      </table>
    </div>
    ${reqList.length > 0 ? `
    <div style="background:#f9fafb;border:1px solid ${BORDER};border-radius:8px;padding:16px 20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:${TEXT_DARK};margin-bottom:10px;">Requirements</div>
      <ul style="margin:0;padding-left:20px;">
        ${reqList.map(r => `<li style="font-size:13px;color:${TEXT_DARK};margin-bottom:4px;">${r}</li>`).join('')}
      </ul>
    </div>` : ''}
    <div style="background:${BRAND_COLOR};border-radius:8px;padding:16px 20px;text-align:center;margin-bottom:4px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#fff;">
        Your registration has been approved!
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">
        Please arrive on time and bring the required documents.
      </p>
    </div>
  `;

  return wrapper(content);
}

export function buildLivelihoodEmail(program) {
  const {
    title = 'Livelihood Program',
    description = '',
    date = '',
    endDate = '',
    startTime = '',
    endTime = '',
    location = '',
    demographic = '',
    slots = '',
  } = program;

  const dateRange = endDate && endDate !== date ? `${date} - ${endDate}` : date;
  const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : startTime;

  const content = `
    <div style="margin-bottom:6px;">${badge('Livelihood Skills Training', '#fef3c7', '#92400e')}</div>
    <h1 style="margin:16px 0 0;font-size:22px;font-weight:800;color:${TEXT_DARK};line-height:1.3;">${title}</h1>
    ${divider()}
    <p style="margin:0 0 20px;font-size:15px;color:${TEXT_DARK};line-height:1.7;">${(description || 'You have been approved to participate in this livelihood skills training program.').replace(/\n/g, '<br/>')}</p>
    <div style="background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);
                border:1px solid #fde68a;border-radius:10px;padding:20px;margin-bottom:20px;">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:12px;">Training Schedule</div>
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${infoRow('Date', dateRange || 'TBA')}
        ${timeRange ? infoRow('Time', timeRange) : ''}
        ${infoRow('Venue', location || 'TBA')}
        ${demographic ? infoRow('For', demographic) : ''}
        ${slots ? infoRow('Slots', String(slots)) : ''}
      </table>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:4px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND_DARK};">
        Registration Approved
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#374151;line-height:1.6;">
        Congratulations! Your registration for this livelihood program has been approved.
        Please be punctual and bring a valid government-issued ID on the day of the training.
      </p>
    </div>
  `;

  return wrapper(content);
}
