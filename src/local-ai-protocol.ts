export type AIRequest={messages:{role:'system'|'user'|'assistant';content:string}[]};
export type AIReply={type:'status'|'text'|'done'|'error';text:string};
