const docsEn = {
  title: 'Documentation',
  subtitle: 'Learn how to monitor a region of a web page and receive email notifications when its text changes.',
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
            'WebMonitor checks a page on a schedule, compares the text inside the element you select, and records every result. You can add email notifications when you want them.',
          ],
        },
        {
          type: 'subsection',
          title: '1. Create an account',
          paragraphs: [
            'Open the registration page and fill in your username, email address, and password. After registration you will be redirected to the login page.',
          ],
          tip: {
            type: 'info',
            text: 'The account email identifies you in WebMonitor. Notifications are sent to the recipient address in your email configuration, not to the account email.',
          },
        },
        {
          type: 'subsection',
          title: '2. Add an email configuration',
          paragraphs: [
            'Open the Email Config page and add an SMTP account. This step is optional for collecting content, but it is required before WebMonitor can send notifications or before you can subscribe to a public task.',
            'You will need the SMTP host, port, sender email, password or app password, and the recipient email address.',
          ],
        },
        {
          type: 'subsection',
          title: '3. Create a monitoring task',
          paragraphs: [
            'Open the Monitor Tasks page and click the create button. Fill in the following fields:',
          ],
          list: {
            type: 'ul',
            items: [
              'Task name for easy identification',
              'Target URL to monitor',
              'XPath selector used to locate the content',
              'Check interval in seconds, at least 10',
              'Email configuration for notifications, optional',
            ],
          },
          tip: {
            type: 'info',
            text: 'A task without an email configuration still runs and records history; it simply sends no email.',
          },
        },
        {
          type: 'subsection',
          title: '4. Review monitoring results',
          paragraphs: [
            'After a task is created, WebMonitor checks the page automatically according to the configured interval.',
            'Use the Dashboard for an overview and the Monitor Logs page for the detailed history of each check.',
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
            'A monitor task watches one element of a web page and records the text it finds there. When that text differs from the previous result, the change is written to the log and, if the task has an email configuration, sent as a notification.',
            'WebMonitor uses Selenium with headless Chromium, so it can read pages that render their content with JavaScript.',
          ],
        },
        {
          type: 'subsection',
          title: 'XPath selector guide',
          paragraphs: [
            'XPath locates the element you want to watch. Here are a few common examples:',
          ],
          codeExamples: [
            { label: 'Select by ID', language: 'xpath', code: '//*[@id="price"]' },
            { label: 'Select by class', language: 'xpath', code: '//div[@class="product-price"]' },
            { label: 'Select by text', language: 'xpath', code: '//span[contains(text(), "In stock")]' },
            { label: 'Watch the whole page body', language: 'xpath', code: '//body' },
          ],
          tip: {
            type: 'success',
            text: 'Open developer tools in your browser and use Copy XPath, then adjust the expression if the copied path depends on layout or position.',
          },
        },
        {
          type: 'subsection',
          title: 'Check interval',
          paragraphs: [
            'The interval controls how often WebMonitor checks the target page.',
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
            text: 'Very short intervals may trigger rate limits on the target site. Choose an interval that fits how often the content actually changes.',
          },
        },
        {
          type: 'subsection',
          title: 'Public tasks',
          paragraphs: [
            'You can publish a task so other users can subscribe to it and receive their own notifications.',
          ],
          list: {
            type: 'ul',
            items: [
              'Private task: only you can view and manage it',
              'Public task: appears in the Public Tasks list while it is public and active, and other users can subscribe',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Test a task',
          paragraphs: [
            'Use the test action to capture the selected region once and confirm that the XPath and page load work as expected.',
            'Testing only previews the captured content and does not send email.',
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
            'Email configurations define how notifications are sent. Each config includes:',
          ],
          list: {
            type: 'ul',
            items: [
              'A readable configuration name',
              'SMTP server host',
              'SMTP port, usually 465 for SSL or 587 for TLS',
              'Sender email address',
              'SMTP password or app password',
              'Recipient email address',
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
            text: 'Most providers require an app password or authorization code rather than your normal mailbox password.',
          },
        },
        {
          type: 'subsection',
          title: 'Send a test email',
          paragraphs: [
            'After saving a configuration, use the test action to verify that the SMTP settings can connect and send a message.',
          ],
        },
        {
          type: 'subsection',
          title: 'Who can use a configuration',
          paragraphs: [
            'Email configurations belong to the user who created them and are only used for that user\'s notifications. There is no instance-wide SMTP account, and a task or subscription cannot use another user\'s configuration.',
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
            'The Public Tasks page lists tasks that their owners have published and left active.',
          ],
          list: {
            type: 'ul',
            items: [
              'Task name and description',
              'Target URL',
              'Owner information',
              'Check interval',
              'Current subscription count',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Subscribe to a task',
          paragraphs: [
            'When you subscribe, you receive notifications when that public task detects changes.',
          ],
          list: {
            type: 'ol',
            items: [
              'Find a task you care about',
              'Click Subscribe',
              'Choose the email configuration for notifications',
              'Confirm the subscription',
            ],
          },
          tip: {
            type: 'info',
            text: 'You need at least one email configuration before subscribing.',
          },
        },
        {
          type: 'subsection',
          title: 'Manage subscriptions',
          paragraphs: [
            'The My Subscriptions page lets you review every subscribed task, turn notifications on or off, switch the email configuration, or unsubscribe. Unsubscribing still works after the task owner makes the task private or stops it.',
          ],
        },
        {
          type: 'subsection',
          title: 'Subscription limits',
          paragraphs: [
            'Each user has a subscription quota. The default is 10 active subscriptions; an administrator can change the limit for a user.',
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
            'The dashboard gives you a quick view of the health of your monitoring setup.',
          ],
          list: {
            type: 'ul',
            items: [
              'Total number of tasks',
              'Running tasks',
              'Recent detected changes',
              'Monitoring success rate',
              'Latest monitoring activity',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Monitor logs',
          paragraphs: [
            'Monitor logs contain a detailed history of every check.',
          ],
          list: {
            type: 'ul',
            items: [
              'Check timestamp',
              'Task information',
              'Execution result',
              'Whether content changed',
              'Content preview when available',
              'Error information when a check fails',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Status meanings',
          list: {
            type: 'ul',
            items: [
              'Unchanged: the check succeeded and no change was detected',
              'Changed: the check succeeded and the content changed',
              'Error: the check failed because of a network, page, or selector issue',
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
          title: 'My XPath selector does not work',
          paragraphs: [
            'Problem: the task cannot capture content or always returns blank results.',
          ],
          list: {
            type: 'ol',
            items: [
              'Verify the XPath in browser developer tools',
              'Check whether the target element is loaded asynchronously',
              'Try a simpler selector such as //body to validate the page load',
              'Use the built-in test action before enabling continuous monitoring',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Email delivery fails',
          paragraphs: [
            'Problem: the test email fails or no notification arrives after a change.',
          ],
          list: {
            type: 'ol',
            items: [
              'Confirm the SMTP host and port',
              'Use an app password instead of your normal login password when required',
              'Make sure SMTP is enabled in your mailbox settings',
              'Make sure the SSL/TLS option matches the selected port',
              'Check the recipient address in the email configuration, not the account email',
              'Check the spam folder',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'A monitor task cannot be created',
          paragraphs: [
            'Problem: task creation is blocked because of a restricted domain or invalid configuration.',
          ],
          list: {
            type: 'ul',
            items: [
              'Some domains may be blocked by the administrator blacklist',
              'Make sure the URL includes http:// or https://',
              'An email configuration is optional for a task; it is not required to start collecting',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'I reached the subscription limit',
          paragraphs: [
            'Problem: you cannot subscribe to more public tasks.',
          ],
          list: {
            type: 'ul',
            items: [
              'Remove subscriptions you no longer need',
              'Ask an administrator to increase your quota if needed',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'The content changed but no email arrived',
          paragraphs: [
            'Problem: the monitor log shows a change, but the mailbox received nothing.',
          ],
          list: {
            type: 'ul',
            items: [
              'Check whether the task has an email configuration attached',
              'Test the configuration on the Email Config page',
              'Check the recipient address and the spam folder',
            ],
          },
        },
        {
          type: 'subsection',
          title: 'Where is this instance\'s data stored?',
          paragraphs: [
            'WebMonitor is self-hosted. This instance keeps accounts, monitor tasks, email configurations, subscriptions, and monitor logs in its deployment database.',
            'Backups are managed by the instance operator. If the deployment container is replaced without a persistent volume or a backup, this data can be lost; ask the operator how backups are handled.',
          ],
        },
      ],
    },
  ],
};

export default docsEn;
