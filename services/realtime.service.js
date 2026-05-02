function subscribeToSlides(presentationId) {
  return {
    channel: `realtime:public:slides:presentation_id=eq.${presentationId}`,
    note: "Use Supabase Realtime JS client in frontend with this filter."
  };
}

module.exports = { subscribeToSlides };
