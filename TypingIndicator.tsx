const TypingIndicator = ({ name }: { name: string }) => {
  return (
    <div className="flex items-end gap-2 mb-3 animate-fade-in">
      <div className="chat-bubble-received px-4 py-3 flex items-center gap-1.5">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
      {name && (
        <span className="text-[10px] text-white/30 mb-1">{name.split(' ')[0]} is typing...</span>
      )}
    </div>
  );
};

export default TypingIndicator;
