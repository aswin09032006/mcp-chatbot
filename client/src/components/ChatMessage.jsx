import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`group w-full text-gray-100 border-b border-black/10 dark:border-gray-900/50 ${isUser ? 'bg-gray-800' : 'bg-transparent'}`}>
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl flex p-4 m-auto">
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-6 h-6 rounded-sm flex items-center justify-center ${isUser ? 'bg-indigo-500' : 'bg-green-500'}`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
