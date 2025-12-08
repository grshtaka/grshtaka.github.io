if (!document.cookie.split('; ').find(row => row.startsWith('dS'))) {
    document.cookie = "dS=true; expires=Fri, 31 Dec 9999 23:59:59 GMT; SameSite=None; Secure";
    window.localStorage.setItem("files", ";readme.txt");
    var q = [
'--------------------------------------------------------------------------------------------------------------',

                                                                                  
'                                                   /                          /                  ',
'                                                 #/                         #/                   ',
'                                                ##           #             ##                   ',
'                                                 ##          ##             ##                   ',
'                                                 ##          ##             ##                   ',
'                  /###    ###  /###     /###    ##  /##   ######## /###    ##  /##      /###    ',
'                 /  ###  / ###/ #### / / #### / ## / ### ######## / ###  / ## / ###    / ###  / ',
'                 /    ###/   ##   ###/ ##  ###/  ##/   ###   ##   /   ###/  ##/   /    /   ###/  ',
'                ##     ##    ##       ####       ##     ##   ##  ##    ##   ##   /    ##    ##   ',
'                ##     ##    ##         ###      ##     ##   ##  ##    ##   ##  /     ##    ##   ',
'                ##     ##    ##           ###    ##     ##   ##  ##    ##   ## ##     ##    ##   ',
'                ##     ##    ##             ###  ##     ##   ##  ##    ##   ######    ##    ##   ',
'               ##     ##    ##        /###  ##  ##     ##   ##  ##    /#   ##  ###   ##    /#   ',
'                ########    ###      / #### /   ##     ##   ##   ####/ ##  ##   ### / ####/ ##  ',
'                   ### ###    ###        ###/     ##    ##    ##   ###   ##  ##   ##/   ###   ## ',
'                       ###                             /                                         ',
'                  ####   ###                           /                                         ',
'                /######  /#                           /                                          ',
'               /     ###/                            /                                           ',

'',
'--------------------------------------------------------------------------------------------------------------',
'',
'                        ICMS SUPREME MEGASYSTEM MANUAL PAGE 2 : YOUR PROGRAMS AND SOFTWARE',
'',
'--------------------------------------------------------------------------------------------------------------',
'',
'Your programs are the tools that allow your computer to work, and more importantly, they are the things you ',
'will see whenever you are using the ICMS Supreme. Mainly, the agenda program.',
'',
'To open up the agenda program, you have to execute it. This can be done from the console, or the user interface.',
'',
'We will use the user interface for this guide, as you will find the console commands in page 4. First, in the',
'dashboard, aim your mouse cursor at "agenda.exe" using your mouse utility, than press your left mouse button.',
'This will execute and launch the agenda program.',
''
    ];
    window.localStorage.setItem("readme.txt", q.join("\n"));
}
if (location.hash.startsWith("#OPENINTEXT;")) {
    window.location.replace("agenda.html#" + location.hash.split(";")[1]);
}

