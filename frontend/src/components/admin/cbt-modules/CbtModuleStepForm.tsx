'use client';

import React, { useState, useEffect } from 'react';
import { apiCall } from '@/utils/adminApi';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/TextArea';
import Select from '@/components/ui/Select';

interface CbtModuleStep {
    id: number;
    module_id: number;
    step_order: number;
    step_type: string;
    content: string;
    user_input_type: string | null;
    user_input_variable: string | null;
    feedback_prompt: string | null;
    options: any;
    tool_to_run: string | null;
    is_skippable: boolean;
    delay_after_ms: number;
    parent_id: number | null;
    extra_data: any;
}

interface CbtModuleStepFormProps {
    moduleId: number;
    step?: CbtModuleStep;
    onSuccess: () => void;
}

const CbtModuleStepForm: React.FC<CbtModuleStepFormProps> = ({ moduleId, step, onSuccess }) => {
    const [formData, setFormData] = useState({
        module_id: moduleId,
        step_order: 0,
        step_type: 'psychoeducation',
        content: '',
        user_input_type: 'none',
        user_input_variable: '',
        feedback_prompt: '',
        options: {},
        tool_to_run: '',
        is_skippable: false,
        delay_after_ms: 0,
        parent_id: null,
        extra_data: {},
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (step) {
            setFormData({
                ...step,
                options: step.options || {},
                extra_data: step.extra_data || {},
            });
        }
    }, [step]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        try {
            setFormData(prev => ({
                ...prev,
                [name]: value ? JSON.parse(value) : {},
            }));
        } catch (error) {
            // Handle JSON parsing error if needed
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            if (step) {
                await apiCall(`/api/v1/admin/cbt-modules/steps/${step.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData),
                });
            } else {
                await apiCall(`/api/v1/admin/cbt-modules/${moduleId}/steps`, {
                    method: 'POST',
                    body: JSON.stringify(formData),
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500">{error}</p>}

            <Input id="step_order" name="step_order" type="number" value={formData.step_order} onChange={handleChange} required label="Step order" className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />
            <p className="text-xs text-gray-400 -mt-2">Steps run in ascending order. Start from 1.</p>

            <Select id="step_type" name="step_type" value={formData.step_type} onChange={handleChange} label="Step type" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors">
                <option value="psychoeducation">Psychoeducation (short info to set context)</option>
                <option value="open_question">Open Question (ask the student something)</option>
                <option value="multiple_choice">Multiple Choice (choose from given options)</option>
                <option value="summary">Summary (recap what’s been shared)</option>
            </Select>
            <p className="text-xs text-gray-400 -mt-2">Mix types to create a smooth, conversational flow.</p>

            <div className="space-y-1">
                <label htmlFor="content" className="block text-sm font-medium text-gray-300">Content</label>
                <Textarea id="content" name="content" placeholder="Write in friendly, natural Bahasa Indonesia. Keep it concise and supportive." value={formData.content} onChange={handleChange} required rows={4} className="w-full min-h-[120px] p-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />
                <p className="text-xs text-gray-400">Example (open question): “Kira-kira, apa yang paling bikin kamu kepikiran akhir-akhir ini?”</p>
            </div>

            <Select id="user_input_type" name="user_input_type" value={formData.user_input_type || 'none'} onChange={handleChange} label="Expected user input" className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors">
                <option value="none">None</option>
                <option value="text">Text (they type a response)</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="likert_scale_1_5">Likert Scale (1–5)</option>
            </Select>
            <p className="text-xs text-gray-400 -mt-2">If users must respond here, select the input type.</p>

            <Input id="user_input_variable" name="user_input_variable" type="text" value={formData.user_input_variable || ''} onChange={handleChange} label="Store response as variable (optional)" placeholder="e.g., negative_thought" className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />
            <p className="text-xs text-gray-400 -mt-2">Name the variable to reference this response in later steps.</p>

            <div className="space-y-1">
                <label htmlFor="feedback_prompt" className="block text-sm font-medium text-gray-300">Feedback prompt (optional)</label>
                <Textarea id="feedback_prompt" name="feedback_prompt" placeholder="If the AI should reflect on the user’s response, write guidance here." value={formData.feedback_prompt || ''} onChange={handleChange} rows={2} className="w-full p-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />
            </div>

            <div className="space-y-1">
                <label htmlFor="options" className="block text-sm font-medium text-gray-300">Options (JSON)</label>
                <Textarea id="options" name="options" placeholder='For multiple_choice, e.g. {"choices": ["A", "B", "C"]}' value={JSON.stringify(formData.options, null, 2)} onChange={handleJsonChange} rows={4} className="w-full min-h-[100px] p-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />
                <p className="text-xs text-gray-400">Provide structured data for this step (only if needed).</p>
            </div>

            <Input id="tool_to_run" name="tool_to_run" type="text" value={formData.tool_to_run || ''} onChange={handleChange} label="Tool to run (optional)" placeholder="e.g., sentiment_analyzer" className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />

            <div className="flex items-center">
                <input id="is_skippable" name="is_skippable" type="checkbox" checked={formData.is_skippable} onChange={handleChange} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                <label htmlFor="is_skippable" className="ml-2 block text-sm text-gray-300">Allow user to skip this step</label>
            </div>

            <Input id="delay_after_ms" name="delay_after_ms" type="number" value={formData.delay_after_ms} onChange={handleChange} label="Delay after (ms)" placeholder="0" className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />
            <p className="text-xs text-gray-400 -mt-2">Optional pause before the next step (in milliseconds).</p>

            <Input id="parent_id" name="parent_id" type="number" value={formData.parent_id || ''} onChange={handleChange} label="Parent step ID (optional)" placeholder="For branching flows" className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />

            <div className="space-y-1">
                <label htmlFor="extra_data" className="block text-sm font-medium text-gray-300">Extra data (JSON)</label>
                <Textarea id="extra_data" name="extra_data" placeholder='Any additional config, e.g. {"tag": "intro"}' value={JSON.stringify(formData.extra_data, null, 2)} onChange={handleJsonChange} rows={4} className="w-full min-h-[100px] p-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm" />
            </div>

            <div className="pt-2">
                <Button type="submit" disabled={isSubmitting} variant="primaryGold" className="shadow-lg hover:shadow-xl">
                    {isSubmitting ? 'Saving…' : 'Save Step'}
                </Button>
            </div>
        </form>
    );
};

export default CbtModuleStepForm;
