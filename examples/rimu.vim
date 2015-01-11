" ~/.vim/after/syntax/rimu.vim
"
" Custom Vim highlighting for custom syntax defined in ~/.rimurc
"

" Admonishments.
syn match rimuAdmonition /^\([A-Z]\+\):/ containedin=ALLBUT,rimuComment,rimuCodeBlock
hi def link rimuAdmonition Special

" ~ strikethrough quote.
syn match rimuSpanDeleted /\\\@<!\~[ \t\n]\@!\(.\|\n\(\s*\n\)\@!\)\{-1,}[\\ \t\n]\@<!\~/ contains=rimuSpanEntity
" Github Flavored Markdown strikethrough.
syn match rimuSpanDeleted /\\\@<!\~\~[ \t\n]\@!\(.\|\n\(\s*\n\)\@!\)\{-1,}[\\ \t\n]\@<!\~\~/ contains=rimuSpanEntity
hi def link rimuSpanDeleted Todo

" Markdown ** quote.
syn match rimuSpanStrong /\\\@<!\*\*[ \t\n]\@!\(.\|\n\(\s*\n\)\@!\)\{-1,}[\\ \t\n]\@<!\*\*/ contains=rimuSpanEntity

" Markdown [link-text](url) and ![alt-text](image-url) syntaxes.
syn match rimuSpanURL /[\\]\@<!!\?\[\_.\{-1,}]\s*(\S\{-1,})/ contains=rimuURLText
syn match rimuURLText /\[\@<=\_.\{-1,}]\@=/ contained containedin=rimuSpanURL