const docsEn = {
  title: 'Documentation',
  subtitle: 'Follow these steps to create a monitor, test it, and get an email when the page changes.',
  footerCta: {
    title: 'Ready to start monitoring?',
    subtitle: 'Create an account and start tracking the pages that matter to you.',
    primary: 'Create account',
    secondary: 'Log in',
  },
  sections: [
    {
      id: 'quick-start',
      title: 'Quick start',
      blocks: [
        {
          type: 'text',
          paragraphs: [
            'WebMonitor watches one element of a page. On every check it loads the page, reads the text at the XPath you set, and stores the result. When that text changes, it can email you.',
          ],
        },
        {
          type: 'subsection',
          title: '1. Create an account',
          paragraphs: [
            'On the home page, click Sign up free. Fill in a username, email address, and password, then log in. Registration returns you to the login page.',
          ],
          tip: {
            type: 'info',
            text: 'Your account email identifies you in WebMonitor. Notifications go to the Receiver email of an email configuration, not to the account email.',
          },
        },
        {
          type: 'subsection',
          title: '2. Add an email configuration',
          paragraphs: [
            'Open Email configuration in the menu and click Add email config. The form asks for Config name, SMTP server, SMTP port, Sender email, SMTP password, and Receiver email, plus a Use SSL encryption switch. You can keep several configurations and choose one per task.',
            'Click Test connection on a saved row. WebMonitor connects to the server and sends exactly one test email to that row\'s Receiver email; you see Test email sent successfully or Test email failed.',
          ],
        },
        {
          type: 'subsection',
          title: '3. Create a monitoring task',
          paragraphs: [
            'Open Monitor tasks and click Create task. The dialog asks for:',
          ],
          list: {
            type: 'ul',
            items: [
              'Task name: a label you will recognize in the list',
              'Monitor URL: the full page address, starting with http:// or https://',
              'XPath selector: the element whose text you want to follow',
              'Check interval (seconds): 300 by default, minimum 10',
              'Email config: a saved configuration, or No notifications',
            ],
          },
          tip: {
            type: 'info',
            text: 'Email config is optional. With No notifications the task still checks the page and records results, it just sends no email. To validate the selector first, turn off Enable monitoring before saving; you can turn it on later with Edit task.',
          },
        },
        {
          type: 'subsection',
          title: '4. Check the first result',
          paragraphs: [
            'Find the task in the list and click Test monitor. A message shows Test succeeded! Content: followed by the beginning of the captured text, or Test failed. A test loads the page once: it sends no email, writes no log entry, and does not change the stored result. If the content is right, open Edit task, turn on Enable monitoring, and click Update task.',
            'The first scheduled check runs about one interval after the task is saved or enabled. Nothing was stored before it, so that entry is recorded as Changed and can send one initial email. Later entries are Unchanged unless the text changes or a check fails. Dashboard shows the overview; Monitor logs holds every check.',
          ],
        },
      ],
    },
    {
      id: 'monitor-tasks',
      title: 'Monitor tasks',
      blocks: [
        {
          type: 'subsection',
          title: 'What a monitor task does',
          paragraphs: [
            'A task belongs to one page and one element. On each run WebMonitor loads Monitor URL, waits for the XPath element, and stores its text. If the text differs from the previous stored value, the run is marked Changed; when an Email config is attached, that change is also sent as email.',
            'Only the selected element is compared, so menus, ads, and other parts of the page do not trigger changes. Pages that fill in their content with JavaScript are supported.',
            'Collection permits public HTTP(S) targets. Redirects and subresources use the same connection checks; local files and private addresses are blocked. Administrators can explicitly allow an exact internal origin with TARGET_ALLOWED_ORIGINS.',
          ],
        },
        {
          type: 'subsection',
          title: 'XPath selector guide',
          paragraphs: [
            'XPath selector is the address of the element inside the page. These examples cover the common cases:',
          ],
          codeExamples: [
            { label: 'Select by ID', language: 'xpath', code: '//*[@id="price"]' },
            { label: 'Select by class', language: 'xpath', code: '//div[@class="product-price"]' },
            { label: 'Select by text', language: 'xpath', code: '//span[contains(text(), "In stock")]' },
            { label: 'Watch the whole page body', language: 'xpath', code: '//body' },
          ],
          tip: {
            type: 'success',
            text: 'In your browser, right-click the value, choose Inspect, then Copy > Copy XPath. Copied expressions are often long and depend on position; shorten them to the smallest stable attribute before you save.',
          },
        },
        {
          type: 'subsection',
          title: 'Check interval',
          paragraphs: [
            'Check interval (seconds) controls how often the page is loaded.',
          ],
          list: {
            type: 'ul',
            items: [
              'Minimum interval: 10 seconds',
              'Default interval: 300 seconds (5 minutes)',
              'You can enter a longer interval according to how often the page changes',
            ],
          },
          tip: {
            type: 'warning',
            text: 'Every check loads the page in full. Very short intervals can hit rate limits on the target site; choose an interval that matches how often the content actually changes.',
          },
        },
        {
          type: 'subsection',
          title: 'Public tasks',
          paragraphs: [
            'Turn on Public task in the create or edit dialog when you want other people on this instance to find and subscribe to the task. It appears on the Public tasks page while it is public and running.',
          ],
          list: {
            type: 'ul',
            items: [
              'Private task: only you can see and manage it',
              'Public task: listed on Public tasks and open to subscriptions',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Test, pause, and edit a task',
          paragraphs: [
            'Test monitor on a task row loads the page once and shows a preview of the captured Content in a message. It sends no email, writes no log entry, and keeps the stored result.',
            'To pause a task, click Edit task, turn off Enable monitoring, and click Update task. Its status changes to Paused and scheduled checks stop; the stored result and logs remain. Turn Enable monitoring on again to resume. Delete task asks for confirmation and removes the task together with its monitor logs.',
          ],
        },
      ],
    },
    {
      id: 'email-config',
      title: 'Email configuration',
      blocks: [
        {
          type: 'subsection',
          title: 'Configure SMTP',
          paragraphs: [
            'Open Email configuration and click Add email config. The form contains:',
          ],
          list: {
            type: 'ul',
            items: [
              'Config name: shown in the task and subscription dropdowns',
              'SMTP server: the host name from your mail provider',
              'SMTP port: usually 465 with Use SSL encryption on, or 587 with it off',
              'Sender email: the account that sends the mail',
              'SMTP password: the password or app password of that account',
              'Receiver email: where notifications arrive',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Common SMTP examples',
          codeExamples: [
            { label: 'Gmail', code: 'Server: smtp.gmail.com\nPort: 465 (SSL) or 587 (TLS)\nUse an app password' },
            { label: 'QQ Mail', code: 'Server: smtp.qq.com\nPort: 465 (SSL)\nEnable SMTP and use an authorization code' },
            { label: '163 Mail', code: 'Server: smtp.163.com\nPort: 465 (SSL)\nEnable SMTP and use a client authorization password' },
            { label: 'Outlook / Hotmail', code: 'Server: smtp.office365.com\nPort: 587 (TLS)' },
          ],
          tip: {
            type: 'info',
            text: 'Most providers require an app password or authorization code instead of your normal mailbox password.',
          },
        },
        {
          type: 'subsection',
          title: 'Send a test email',
          paragraphs: [
            'Click Test connection on a saved row. Connection problems are reported immediately; when the connection succeeds, WebMonitor sends a test message to that row’s Receiver email. Test email sent successfully means the outgoing mail server accepted it; if it is missing from your inbox, check spam and the recipient address. If the test fails, check the server, port, encryption setting, account and password.',
          ],
        },
        {
          type: 'subsection',
          title: 'Who can use a configuration',
          paragraphs: [
            'Configurations belong to your account and are visible only to you. Attach one in a task\'s Email config field; subscribers pick their own configuration when they subscribe, so a public task never sends subscriber mail through its owner\'s account.',
          ],
        },
      ],
    },
    {
      id: 'public-tasks',
      title: 'Public tasks and subscriptions',
      blocks: [
        {
          type: 'subsection',
          title: 'Browse public tasks',
          paragraphs: [
            'Public tasks lists tasks that their owners have published and left running. Each card shows:',
          ],
          list: {
            type: 'ul',
            items: [
              'Task name and description',
              'Monitor URL',
              'Creator',
              'Check interval',
              'Subscriptions',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Subscribe to a task',
          paragraphs: [
            'A subscription sends you the changes of someone else\'s public task, using your own mailbox.',
          ],
          list: {
            type: 'ol',
            items: [
              'Open Public tasks',
              'Click Subscribe on a task',
              'In Choose email configuration, pick one of your configurations',
              'Click Confirm subscription',
            ],
          },
          tip: {
            type: 'info',
            text: 'You need at least one email configuration first; the dialog tells you when none exists. Mail goes to the Receiver email of the configuration you pick.',
          },
        },
        {
          type: 'subsection',
          title: 'Manage subscriptions',
          paragraphs: [
            'My subscriptions lists every subscription. Turn notifications on or off, switch the email configuration, or cancel the subscription. A disabled subscription keeps its record but stops email, and you can still cancel it after the owner pauses the task or makes it private.',
            'When a task becomes private or inactive, its current name, URL and owner are hidden and the subscription is marked unavailable. You can still cancel it. Notifications process all enabled subscribers in batches.',
          ],
        },
        {
          type: 'subsection',
          title: 'Subscription limits',
          paragraphs: [
            'By default an account may hold 10 enabled subscriptions, and Public tasks shows your Remaining slots. Disabled subscriptions do not use a slot. An administrator can change your limit in User management.',
          ],
        },
      ],
    },
    {
      id: 'dashboard',
      title: 'Dashboard and logs',
      blocks: [
        {
          type: 'subsection',
          title: 'Dashboard overview',
          paragraphs: [
            'Dashboard summarizes your monitoring:',
          ],
          list: {
            type: 'ul',
            items: [
              'Total tasks',
              'Active tasks',
              'Recent changes',
              'Success rate',
              'Recent monitoring activity',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Monitor logs',
          paragraphs: [
            'Monitor logs shows one task at a time. Pick it in Select monitor task, then read the table:',
          ],
          list: {
            type: 'ul',
            items: [
              'Select monitor task: the task whose history you want to see',
              'Checked at: when that run happened',
              'Status: Unchanged, Changed, or Error',
              'New content: the text captured on that run',
              'Error message: why a run failed',
              'Rows per page: how many records are listed',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Status meanings',
          list: {
            type: 'ul',
            items: [
              'Unchanged: the run succeeded and the text matches the previous result',
              'Changed: the run succeeded and the text differs; the first run is always Changed because nothing was stored before it',
              'Error: the run failed; the error message names the network, page, or XPath problem',
            ],
          },
        },
      ],
    },
    {
      id: 'faq',
      title: 'FAQ',
      blocks: [
        {
          type: 'subsection',
          title: 'Test monitor fails or the content is empty',
          paragraphs: [
            'Problem: Test monitor reports Test failed, or the Content preview is empty even though the page shows the text.',
          ],
          list: {
            type: 'ol',
            items: [
              'In the browser, open the page, inspect the element, and copy its XPath again',
              'Check whether the text appears only after the page finishes loading asynchronously',
              'Try a simple selector such as //body to prove the page itself loads',
              'Edit the task, keep Enable monitoring off, save, and click Test monitor again',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Test email fails',
          paragraphs: [
            'Problem: Test connection returns Test email failed.',
          ],
          list: {
            type: 'ol',
            items: [
              'Confirm the SMTP server and port with your mail provider',
              'Use an app password or authorization code if the provider requires one',
              'Make sure SMTP is enabled in the mailbox settings',
              'Match Use SSL encryption to the port: on for 465, off for 587',
              'Check that Sender email is the account that owns the password',
              'Check the Receiver email and the spam folder',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'A monitor task cannot be created',
          paragraphs: [
            'Problem: Create task is refused because of a restricted domain or an invalid field.',
          ],
          list: {
            type: 'ul',
            items: [
              'The domain may be blocked by an administrator; ask for it to be removed from Blacklist management',
              'Make sure Monitor URL includes http:// or https://',
              'Email config is optional: No notifications is a valid choice',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'I reached the subscription limit',
          paragraphs: [
            'Problem: Subscribe is refused because your account has no free slot.',
          ],
          list: {
            type: 'ul',
            items: [
              'Disable or cancel subscriptions you no longer need in My subscriptions',
              'Ask an administrator to raise your limit in User management',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'The content changed but no email arrived',
          paragraphs: [
            'Problem: Monitor logs shows Changed, but the mailbox received nothing.',
          ],
          list: {
            type: 'ul',
            items: [
              'The task may use No notifications in its Email config field',
              'A subscription may have notifications disabled, or use a configuration with a different Receiver email',
              'Test the configuration and check the spam folder',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Where is this instance\'s data stored?',
          paragraphs: [
            'Accounts, monitor tasks, email configurations, subscriptions, and logs are stored by this WebMonitor instance.',
            'Backups are the administrator\'s responsibility; if the instance is rebuilt without a backup, this data cannot be recovered. Ask the administrator how backups are handled.',
          ],
        },
      ],
    },
  ],
};

export default docsEn;
