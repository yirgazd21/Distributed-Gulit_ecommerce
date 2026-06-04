export const createChapaPayment = async (apiCall, data) => {
  try {
    const res = await apiCall(data).unwrap();

    const checkout_url = res?.data?.checkout_url;

    if (!checkout_url) {
      throw new Error("Missing checkout URL from Chapa");
    }

    // redirect to Chapa
    window.location.href = checkout_url;

  } catch (error) {
    console.error("Chapa init error:", error);
    throw error;
  }
};