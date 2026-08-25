这个和 Windows App Restriction 其实是一脉相承的，都是通过限制某些网页的使用时间来减少“未经察觉的focus”。


这是一个 IE Extension。点开之后能看到下图入口页面，非常简单明确。

所有内容都可以定制，包括时间、时段，以及匹配方式。它是按网址匹配，还是网址加关键词匹配，都可以定制。


<img width="1049" height="685" alt="image" src="https://github.com/user-attachments/assets/5a345c06-ab35-40a8-a24c-8c1f2a095299" />

原则是尽量不要干扰到正常的工作和正式使用，而是比较精准地识别并关掉那些休闲娱乐的内容。如果被限制访问了，就会看到类似这样的提示。
有两种：

1. 直接关
2. 先跳转到某一个指定页，然后暂时锁定一下
<img width="322" height="116" alt="image" src="https://github.com/user-attachments/assets/b8996965-674d-4424-8c20-92eb72fe10a7" />

<img width="1277" height="594" alt="image" src="https://github.com/user-attachments/assets/91091228-ed8f-427b-8b98-a9ab9a2c4e22" />

但是注意一下：不管是什么规则，只要触发了锁定，也不管这个锁定后的action是跳转到页面还是直接关闭，它都会同时对其他所有规则执行锁定（lock）。就拿下图做一个例子：

这个下图是由 bilibili.com 触发的 lock。但是这个 lock 不只是针对它这一个网站，而是对于所有规则里的网址（或者说你设定的这些规则），它们全部都被 lock 了。

因为这里的思路逻辑是，放在这里的规则一般都是 recreation（休闲娱乐）的东西。你去纠结说你是在看视频看了 10 分钟，还是跟 AI 聊人生、聊理想聊了 10 分钟，其实都没有区别，都是休闲娱乐的东西。

这当然也是为了防止一种情况：用户先去看视频看 10 分钟，然后去跟 AI 聊 10 分钟，接着再去看视频看 10 分钟，以此循环。

不过实际使用的时候，大家自己看怎么改吧。反正有需要定制的东西，还是那句话，直接交给 Codex 或者 Claude 去改吧。

人生是旷野，可是代码是沼泽，能用就用，不能用就改。 请放过自己，去折磨AI。 

<img width="1316" height="657" alt="image" src="https://github.com/user-attachments/assets/25173e0a-d1f1-4007-9293-9af59a78e3d3" />
