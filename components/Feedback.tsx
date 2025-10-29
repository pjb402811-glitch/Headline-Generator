import { useState, FormEvent } from 'react';

const Feedback = () => {
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [rating, setRating] = useState<null | 'good' | 'bad'>(null);

  // FIX: Changed React.FormEvent to FormEvent and imported it from 'react' to fix a TypeScript error.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
    // In a real app, you would send this feedback to a server.
    console.log("Feedback submitted:", { rating });
  };

  if (feedbackSent) {
    return (
      <div className="text-center p-6 bg-green-900/50 border border-green-700 rounded-lg">
        <p className="text-lg font-medium text-green-200">소중한 의견 감사합니다!</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-gray-800 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-200 text-center mb-4">생성된 결과가 유용했나요?</h3>
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <div className="flex space-x-4 mb-4">
          <button
            type="button"
            onClick={() => setRating('good')}
            className={`px-4 py-2 rounded-full border-2 transition-colors ${rating === 'good' ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600'}`}
          >
            👍 만족
          </button>
          <button
            type="button"
            onClick={() => setRating('bad')}
            className={`px-4 py-2 rounded-full border-2 transition-colors ${rating === 'bad' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600'}`}
          >
            👎 불만족
          </button>
        </div>
        {rating && (
          <button
            type="submit"
            className="mt-2 px-6 py-2 bg-slate-600 text-white font-semibold rounded-md hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          >
            피드백 제출
          </button>
        )}
      </form>
    </div>
  );
};

export default Feedback;