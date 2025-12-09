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
'                                       WELCOME, TO THE GARDEN OF MIRRORS',
'',
'--------------------------------------------------------------------------------------------------------------',
'',
'This is a place where I gather the fragments- ',
'dreams, symbols, thoughts, and the moments that feel more real than reality itself.',
'',
'A place to track the patterns that move beneath the surface of ordinary life',
'',
'and to observe the mind the way a smith studies metal:',
'heating it, folding it, burning away what doesn'"'"'t belong,',
'and shaping what remains into something precise.',
''
    ];
    window.localStorage.setItem("readme.txt", q.join("\n"));
}
if (location.hash.startsWith("#OPENINTEXT;")) {
    window.location.replace("agenda.html#" + location.hash.split(";")[1]);
}

