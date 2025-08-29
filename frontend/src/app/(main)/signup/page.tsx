"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { 
  FiMail, 
  FiLock, 
  FiUser, 
  FiPhone, 
  FiCalendar, 
  FiMapPin, 
  FiBook 
} from "@/icons";
import ParticleBackground from "@/components/ui/ParticleBackground";
import { registerUser } from "@/services/api";

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    city: "",
    university: "",
    major: "",
    yearOfStudy: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
    allowEmailCheckins: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  const studentTestimonials = [
    {
      name: "Sari Dewi",
      image: "/images/student-testimonials/sari.jpg", // Placeholder path
      university: "Universitas Gadjah Mada",
      major: "Psychology",
      review: "Aika telah membantu saya mengatasi kecemasan akademik. Fitur journaling dan sesi CBT-nya sangat membantu dalam perjalanan mental health saya."
    },
    {
      name: "Budi Santoso",
      image: "/images/student-testimonials/budi.jpg", // Placeholder path
      university: "Institut Teknologi Bandung",
      major: "Computer Science",
      review: "Sebagai mahasiswa teknik yang sering stress, Aika memberikan dukungan 24/7 yang saya butuhkan. AI companion yang sangat understanding dan supportive."
    },
    {
      name: "Maya Kusuma",
      image: "/images/student-testimonials/maya.jpg", // Placeholder path
      university: "Universitas Indonesia",
      major: "Medical Student",
      review: "Platform yang luar biasa! Aika membantu saya manage burnout selama masa koass. Fitur mood tracking dan mindfulness exercises sangat efektif."
    },
    {
      name: "Rian Pratama",
      image: "/images/student-testimonials/rian.jpg", // Placeholder path
      university: "Universitas Padjadjaran",
      major: "Business Administration",
      review: "UGM-AICare bukan hanya aplikasi, tapi teman yang selalu ada. Aika membantu saya develop self-awareness dan coping strategies yang lebih baik."
    },
    {
      name: "Indira Sari",
      image: "/images/student-testimonials/indira.jpg", // Placeholder path
      university: "Universitas Airlangga",
      major: "Public Health",
      review: "Sangat impressed dengan kualitas therapeutic modules di platform ini. Aika memberikan guidance yang personal dan evidence-based untuk mental wellness."
    }
  ];

  // Rotate testimonials every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % studentTestimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [studentTestimonials.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Client-side validation
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      setError("Please fill in all required fields.");
      setIsLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    // Password strength validation
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    // Password confirmation validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    // Check for password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(formData.password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      setIsLoading(false);
      return;
    }

    // Terms and conditions validation
    if (!formData.agreeToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      setIsLoading(false);
      return;
    }

    try {
      await registerUser({
        name: `${formData.firstName} ${formData.lastName}`,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        city: formData.city,
        university: formData.university,
        major: formData.major,
        yearOfStudy: formData.yearOfStudy,
        password: formData.password,
        allowEmailCheckins: formData.allowEmailCheckins
      });

      setSuccess("Account created successfully! Please check your email for verification instructions.");
      // Clear form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        city: "",
        university: "",
        major: "",
        yearOfStudy: "",
        password: "",
        confirmPassword: "",
        agreeToTerms: false,
        allowEmailCheckins: true
      });
      // Redirect to signin after 3 seconds
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
    } catch (err: unknown) {
      setError(
        (err instanceof Error && err.message) ||
          "An unexpected error occurred. Please try again."
      );
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d58]/95 via-[#0a2a6e]/95 to-[#173a7a]/95 flex">
      {/* Background Particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <ParticleBackground count={70} colors={["#FFCA40", "#6A98F0", "#ffffff"]} minSize={2} maxSize={8} speed={1} />
      </div>

      {/* Left Side - Student Testimonials Carousel */}
      <div className="hidden lg:flex lg:w-1/3 flex-col justify-center relative overflow-hidden">
        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">
              Trusted by Students Across Indonesia
            </h2>
            <p className="text-white/70 text-sm">
              Join thousands of students who found support through UGM-AICare
            </p>
          </div>

          {/* Large Square Picture Carousel */}
          <motion.div
            key={testimonialIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.7 }}
            className="relative flex flex-col items-center"
          >
            {/* Large Square Profile Image with Overlay */}
            <div className="relative w-80 h-80 rounded-2xl overflow-hidden shadow-2xl group">
              {/* Background placeholder with gradient */}
              <div className="w-full h-full bg-gradient-to-br from-[#FFCA40]/20 to-[#001d58]/60 flex items-center justify-center">
                {/* Using initials as placeholder for student photos */}
                <span className="text-white/40 font-bold text-8xl">
                  {studentTestimonials[testimonialIndex].name.charAt(0)}
                </span>
              </div>
              
              {/* Bottom gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* Overlay content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                {/* Student Name */}
                <h3 className="text-2xl font-bold mb-2 drop-shadow-lg">
                  {studentTestimonials[testimonialIndex].name}
                </h3>
                
                {/* Academic Info */}
                <div className="mb-3">
                  <p className="text-[#FFCA40] font-semibold text-sm mb-1 drop-shadow">
                    {studentTestimonials[testimonialIndex].major}
                  </p>
                  <p className="text-white/90 text-xs drop-shadow">
                    {studentTestimonials[testimonialIndex].university}
                  </p>
                </div>
                
                {/* Testimonial Quote */}
                <div className="relative">
                  <div className="text-[#FFCA40] text-2xl leading-none">&ldquo;</div>
                  <p className="text-white/95 text-sm leading-relaxed italic px-4 drop-shadow">
                    {studentTestimonials[testimonialIndex].review}
                  </p>
                  <div className="text-[#FFCA40] text-2xl leading-none text-right rotate-180">&ldquo;</div>
                </div>
              </div>
              
              {/* Subtle border glow */}
              <div className="absolute inset-0 rounded-2xl border border-[#FFCA40]/20 group-hover:border-[#FFCA40]/40 transition-all duration-300"></div>
            </div>
          </motion.div>

          {/* Testimonial Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {studentTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setTestimonialIndex(index)}
                aria-label={`View testimonial ${index + 1}`}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === testimonialIndex
                    ? "bg-[#FFCA40] scale-125"
                    : "bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex justify-between items-center mt-6 px-4">
            <button
              onClick={() => setTestimonialIndex((prev) => 
                prev === 0 ? studentTestimonials.length - 1 : prev - 1
              )}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200"
              aria-label="Previous testimonial"
            >
              <span className="text-white text-sm">‹</span>
            </button>
            <span className="text-white/50 text-xs">
              {testimonialIndex + 1} / {studentTestimonials.length}
            </span>
            <button
              onClick={() => setTestimonialIndex((prev) => 
                prev === studentTestimonials.length - 1 ? 0 : prev + 1
              )}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all duration-200"
              aria-label="Next testimonial"
            >
              <span className="text-white text-sm">›</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-6 lg:p-8 relative z-10">
        <div className="w-full max-w-3xl">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Create Your Account</h1>
              <p className="text-white/70">
                Join the UGM-AICare community and start your mental wellness journey
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm"
              >
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 text-sm"
              >
                {success}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-white/80 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-white/80 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                    <FiMail className="inline mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="your.email@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-white/80 mb-2">
                    <FiPhone className="inline mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="+62 123 4567 8900"
                  />
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-white/80 mb-2">
                    <FiCalendar className="inline mr-1" />
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-white/80 mb-2">
                    <FiUser className="inline mr-1" />
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                  >
                    <option value="" className="bg-[#001d58] text-white">Select Gender</option>
                    <option value="male" className="bg-[#001d58] text-white">Male</option>
                    <option value="female" className="bg-[#001d58] text-white">Female</option>
                    <option value="other" className="bg-[#001d58] text-white">Other</option>
                    <option value="prefer_not_to_say" className="bg-[#001d58] text-white">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-white/80 mb-2">
                    <FiMapPin className="inline mr-1" />
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="Your city"
                  />
                </div>
              </div>

              {/* Academic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="university" className="block text-sm font-medium text-white/80 mb-2">
                    <FiBook className="inline mr-1" />
                    University
                  </label>
                  <input
                    type="text"
                    id="university"
                    name="university"
                    value={formData.university}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="Your university name"
                  />
                </div>
                <div>
                  <label htmlFor="major" className="block text-sm font-medium text-white/80 mb-2">
                    Major/Field of Study
                  </label>
                  <input
                    type="text"
                    id="major"
                    name="major"
                    value={formData.major}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="Your field of study"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="yearOfStudy" className="block text-sm font-medium text-white/80 mb-2">
                  Year of Study
                </label>
                <select
                  id="yearOfStudy"
                  name="yearOfStudy"
                  value={formData.yearOfStudy}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                >
                  <option value="" className="bg-[#001d58] text-white">Select Year</option>
                  <option value="1" className="bg-[#001d58] text-white">1st Year</option>
                  <option value="2" className="bg-[#001d58] text-white">2nd Year</option>
                  <option value="3" className="bg-[#001d58] text-white">3rd Year</option>
                  <option value="4" className="bg-[#001d58] text-white">4th Year</option>
                  <option value="5" className="bg-[#001d58] text-white">5th Year</option>
                  <option value="6" className="bg-[#001d58] text-white">6th Year</option>
                  <option value="graduate" className="bg-[#001d58] text-white">Graduate Student</option>
                </select>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                    <FiLock className="inline mr-1" />
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="Create a strong password"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Must be 8+ characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
                    <FiLock className="inline mr-1" />
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-all duration-200"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    required
                    className="w-4 h-4 text-[#FFCA40] bg-white/10 border-white/20 rounded focus:ring-[#FFCA40] focus:ring-2"
                  />
                  <label htmlFor="agreeToTerms" className="ml-2 text-sm text-white/80">
                    I agree to the{" "}
                    <Link href="/terms" className="text-[#FFCA40] hover:text-[#FFAB00] underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-[#FFCA40] hover:text-[#FFAB00] underline">
                      Privacy Policy
                    </Link>
                    *
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowEmailCheckins"
                    name="allowEmailCheckins"
                    checked={formData.allowEmailCheckins}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-[#FFCA40] bg-white/10 border-white/20 rounded focus:ring-[#FFCA40] focus:ring-2"
                  />
                  <label htmlFor="allowEmailCheckins" className="ml-2 text-sm text-white/80">
                    I would like to receive mental wellness check-ins and tips via email
                  </label>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-[#FFCA40] text-[#001D58] font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:bg-[#FFAB00] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#001D58] border-t-transparent mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </motion.button>

              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-white/60">or</span>
                  </div>
                </div>

                <div className="text-center">
                  <Link 
                    href="/signin-ugm" 
                    className="inline-flex items-center text-sm text-[#FFCA40] hover:text-[#FFAB00] transition-colors"
                  >
                    <FiUser className="mr-2" size={16} />
                    UGM Students - Sign in with Google
                  </Link>
                </div>

                <p className="text-white/70 text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/signin"
                    className="text-[#FFCA40] hover:text-[#FFAB00] font-semibold transition-colors duration-200"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}