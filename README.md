This project follows the same line of thinking as Windows App Restriction. Both are about limiting the time spent on certain websites or applications, so that they reduce unnoticed focus drift.

This is an Edge extension. After opening it, you will see the simple entry page shown below.

Everything can be customized, including duration, active time windows, and matching method. Rules can match by URL only, or by URL plus keywords.

<img width="1049" height="685" alt="image" src="https://github.com/user-attachments/assets/5a345c06-ab35-40a8-a24c-8c1f2a095299" />

The principle is to interfere as little as possible with normal work and serious use, while more precisely identifying and closing leisure or entertainment content. If access is restricted, you will see a message like this.

There are two possible actions:

1. Close the page directly.
2. Redirect the page to a specified page first, then lock it for a while.

<img width="322" height="116" alt="image" src="https://github.com/user-attachments/assets/b8996965-674d-4424-8c20-92eb72fe10a7" />

<img width="1277" height="594" alt="image" src="https://github.com/user-attachments/assets/91091228-ed8f-427b-8b98-a9ab9a2c4e22" />

One important detail: no matter which rule is triggered, once it enters lock mode, all other rules are locked at the same time. This is true whether the post-lock action is redirecting the page or closing it directly.

For example, in the screenshot below, the lock was triggered by `bilibili.com`. But this lock is not only for that one website. It applies to every website or rule in the rule list.

The logic is that the rules placed here are generally for recreation or entertainment. Whether you spent 10 minutes watching videos, or 10 minutes chatting with AI about life and ideals, the category is basically the same: recreational use.

This also prevents a common loophole: watching videos for 10 minutes, then chatting with AI for 10 minutes, then going back to videos for another 10 minutes, and repeating that loop.

Of course, in real usage, everyone can adjust this however they want. If something needs customization, the same advice applies: hand it to Codex or Claude and let it modify the code.

Life is open country, but code is a swamp. Use what works; change what does not. Please be kind to yourself and let the AI suffer instead.

<img width="1316" height="657" alt="image" src="https://github.com/user-attachments/assets/25173e0a-d1f1-4007-9293-9af59a78e3d3" />
